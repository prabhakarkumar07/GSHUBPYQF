-- =====================================================================
-- Premium coupon codes.
-- Equivalent to reference 014_coupons.sql
-- Safe to run multiple times (uses IF NOT EXISTS, CREATE OR REPLACE where appropriate)
-- =====================================================================

create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description    text check (description is null or char_length(description) <= 160),
  discount_type  text not null default 'percent' check (discount_type in ('percent', 'flat')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  applies_to     text not null default 'both' check (applies_to in ('both', 'monthly', 'yearly')),
  max_uses       int check (max_uses is null or max_uses > 0),
  once_per_user  boolean not null default true,
  valid_from     timestamptz,
  valid_until    timestamptz,
  is_active      boolean not null default false,
  show_on_page   boolean not null default false,
  created_at     timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);
alter table public.coupons enable row level security;
drop policy if exists "coupons: super admin" on public.coupons;
create policy "coupons: super admin" on public.coupons for all using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.payments add column if not exists coupon_code text;
alter table public.payments add column if not exists original_paise int;
do $$
begin
  -- Safely drop and recreate constraint if needed
  begin
    alter table public.payments drop constraint if exists payments_amount_paise_check;
  exception when undefined_object then
    -- Constraint doesn't exist, which is fine
  end;

  alter table public.payments add constraint payments_amount_paise_check check (amount_paise >= 0);
end $$;

/** Price for a plan after a coupon. Returns ok=false with a message when the code can't be used. */
create or replace function public._coupon_price(p_user uuid, p_code text, p_plan text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.plan_settings; c public.coupons; v_price int; v_off numeric; v_final int; v_used int; v_code text := upper(btrim(coalesce(p_code, '')));
begin
  select * into s from public.plan_settings where id = 1;
  if p_plan not in ('monthly', 'yearly') then return jsonb_build_object('ok', false, 'message', 'Choose a plan'); end if;
  v_price := case p_plan when 'yearly' then s.price_yearly else s.price_monthly end;
  if v_code = '' then return jsonb_build_object('ok', true, 'price', v_price, 'final', v_price, 'off', 0); end if;

  select * into c from public.coupons where code = v_code;
  if c.id is null or not c.is_active then return jsonb_build_object('ok', false, 'message', 'This coupon code is not valid'); end if;
  if c.valid_from is not null and now() < c.valid_from then return jsonb_build_object('ok', false, 'message', 'This coupon is not active yet'); end if;
  if c.valid_until is not null and now() > c.valid_until then return jsonb_build_object('ok', false, 'message', 'This coupon has expired'); end if;
  if c.applies_to <> 'both' and c.applies_to <> p_plan then
    return jsonb_build_object('ok', false, 'message', 'This coupon works only on the ' || c.applies_to || ' plan');
  end if;
  if c.max_uses is not null then
    select count(*) into v_used from public.payments where coupon_code = c.code and status = 'paid';
    if v_used >= c.max_uses then return jsonb_build_object('ok', false, 'message', 'This coupon has been fully used'); end if;
  end if;
  if c.once_per_user and p_user is not null
     and exists (select 1 from public.payments where coupon_code = c.code and status = 'paid' and user_id = p_user) then
    return jsonb_build_object('ok', false, 'message', 'You have already used this coupon');
  end if;

  v_off := case c.discount_type when 'percent' then round(v_price * c.discount_value / 100.0) else c.discount_value end;
  v_final := greatest(0, v_price - v_off::int);
  return jsonb_build_object('ok', true, 'code', c.code, 'price', v_price, 'final', v_final, 'off', v_price - v_final,
                            'discount_type', c.discount_type, 'discount_value', c.discount_value, 'description', c.description);
end $$;
revoke all on function public._coupon_price(uuid, text, text) from public, anon, authenticated;
grant execute on function public._coupon_price(uuid, text, text) to service_role;

/** For the Premium page: check a code for both plans. */
create or replace function public.check_coupon(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('monthly', public._coupon_price(auth.uid(), p_code, 'monthly'),
                            'yearly',  public._coupon_price(auth.uid(), p_code, 'yearly'));
$$;
revoke all on function public.check_coupon(text) from public;
grant execute on function public.check_coupon(text) to anon, authenticated;

/** Offers shown on the Premium page. */
create or replace function public.public_coupons()
returns table (code text, description text, discount_type text, discount_value numeric, applies_to text, valid_until timestamptz)
language sql stable security definer set search_path = public as $$
  select c.code, c.description, c.discount_type, c.discount_value, c.applies_to, c.valid_until
  from public.coupons c
  where c.is_active and c.show_on_page
    and (c.valid_from is null or c.valid_from <= now()) and (c.valid_until is null or c.valid_until >= now())
    and (c.max_uses is null or (select count(*) from public.payments p where p.coupon_code = c.code and p.status = 'paid') < c.max_uses)
  order by c.created_at desc limit 5;
$$;
revoke all on function public.public_coupons() from public;
grant execute on function public.public_coupons() to anon, authenticated;

/** Super admin list with usage and revenue per code. */
create or replace function public.admin_coupons()
returns table (id uuid, code text, description text, discount_type text, discount_value numeric, applies_to text,
               max_uses int, once_per_user boolean, valid_from timestamptz, valid_until timestamptz,
               is_active boolean, show_on_page boolean, created_at timestamptz, uses bigint, revenue numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_super_admin() then raise exception 'Super admin only'; end if;
  return query
  select c.id, c.code, c.description, c.discount_type, c.discount_value, c.applies_to, c.max_uses, c.once_per_user,
         c.valid_from, c.valid_until, c.is_active, c.show_on_page, c.created_at,
         (select count(*) from public.payments p where p.coupon_code = c.code and p.status = 'paid'),
         coalesce((select sum(p.amount_paise) / 100.0 from public.payments p where p.coupon_code = c.code and p.status = 'paid'), 0)
  from public.coupons c order by c.created_at desc;
end $$;
revoke all on function public.admin_coupons() from public, anon;
grant execute on function public.admin_coupons() to authenticated;

-- Activation also notes the coupon on the subscription (shown in Revenue).
create or replace function public._activate_payment(p_order text, p_payment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments; v_start timestamptz; v_end timestamptz; v_sub uuid;
begin
  select * into p from public.payments where razorpay_order_id = p_order for update;
  if p.id is null then raise exception 'Order not found'; end if;
  if p.status = 'paid' then
    return jsonb_build_object('ok', true, 'already', true, 'until', public._premium_until(p.user_id));
  end if;
  update public.payments set status = 'paid', razorpay_payment_id = p_payment, paid_at = now() where id = p.id;
  v_start := greatest(now(), coalesce(public._premium_until(p.user_id), now()));
  v_end := v_start + case p.plan when 'yearly' then interval '365 days' else interval '30 days' end;
  insert into public.subscriptions (user_id, plan, starts_at, ends_at, amount, source, method, note, payment_id, created_by)
  values (p.user_id, p.plan, v_start, v_end, round(p.amount_paise / 100.0, 2), 'razorpay',
          case when p.amount_paise = 0 then 'coupon' else 'razorpay' end,
          case when p.coupon_code is not null then 'Coupon ' || p.coupon_code end, p.id, p.user_id)
  returning id into v_sub;
  return jsonb_build_object('ok', true, 'until', v_end, 'subscription', v_sub);
end $$;
revoke all on function public._activate_payment(text, text) from public, anon, authenticated;
grant execute on function public._activate_payment(text, text) to service_role;