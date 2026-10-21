-- =====================================================================
-- Freemium: free limits + Premium (monthly / yearly) + revenue.
-- Equivalent to reference 013_freemium.sql
-- Safe to run multiple times (uses IF NOT EXISTS, CREATE OR REPLACE where appropriate)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Settings
-- ---------------------------------------------------------------------
create table if not exists public.plan_settings (
  id                   int primary key default 1 check (id = 1),
  enabled              boolean not null default false,
  free_daily_questions int not null default 25  check (free_daily_questions between 0 and 1000),
  free_weekly_tests    int not null default 1   check (free_weekly_tests between 0 and 100),
  price_monthly        int not null default 99  check (price_monthly between 1 and 100000),
  price_yearly         int not null default 299 check (price_yearly between 1 and 100000),
  trial_days           int not null default 7   check (trial_days between 0 and 90),
  updated_at           timestamptz not null default now()
);
insert into public.plan_settings (id) values (1) on conflict do nothing;
alter table public.plan_settings enable row level security;
drop policy if exists "plan settings: public read" on public.plan_settings;
create policy "plan settings: public read" on public.plan_settings for select using (true);

-- ---------------------------------------------------------------------
-- 2. Payments (Razorpay orders) and subscriptions
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plan                text not null check (plan in ('monthly', 'yearly')),
  amount_paise        int  not null check (amount_paise > 0),
  currency            text not null default 'INR',
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  status              text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "payments: own read" on public.payments;
create policy "payments: own read" on public.payments for select using (user_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------
-- 3. Subscriptions
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan            text not null check (plan in ('monthly', 'yearly')),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  amount          numeric(8,2) not null check (amount > 0),
  source          text not null,
  method          text not null,
  note            text,
  payment_id      uuid references public.payments(id),
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions: own read" on public.subscriptions;
create policy "subscriptions: own read" on public.subscriptions for select using (user_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------
-- 4. Premium status function
-- ---------------------------------------------------------------------
create or replace function public._premium_until(p_user_id uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ends_at from public.subscriptions
     where user_id = p_user_id
       and status = 'active'
       and ends_at > now()
     order by ends_at desc
     limit 1),
    (select trial_until from public.profiles where id = p_user_id)
  );
$$;
revoke all on function public._premium_until(uuid) from public;
grant execute on function public._premium_until(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Premium enforcement trigger on quiz_attempts
-- ---------------------------------------------------------------------
create or replace function public.enforce_premium_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s public.plan_settings;
  free_today int;
  free_this_week int;
  now_tz timestamptz;
  is_premium boolean;
begin
  -- Get settings
  select * into s from public.plan_settings where id = 1;

  -- If premium features are disabled, no limits apply
  if not s.enabled then
    return new;
  end if;

  -- Check if user is premium
  is_premium := (public._premium_until(new.user_id) > now());

  -- Staff and premium users are not limited
  if (select role from public.profiles where id = new.user_id) in ('admin', 'super_admin') or is_premium then
    return new;
  end if;

  -- Calculate current time in IST (Asia/Kolkata)
  now_tz := now() at time zone 'Asia/Kolkata';

  -- Check daily limit for practice questions
  if (new.mode = 'practice' or new.mode = 'exam') and new.source = 'PYQ' then
    select count(*) into free_today
    from public.quiz_attempts
    where user_id = new.user_id
      and mode in ('practice', 'exam')
      and source = 'PYQ'
      and created_at >= date_trunc('day', now_tz)
      and created_at < date_trunc('day', now_tz) + interval '1 day';

    if free_today >= s.free_daily_questions then
      raise exception 'Daily free practice question limit exceeded (%/%)', free_today, s.free_daily_questions;
    end if;
  end if;

  -- Check weekly limit for tests
  if new.mode = 'exam' and new.source = 'TEST' then
    select count(*) into free_this_week
    from public.quiz_attempts
    where user_id = new.user_id
      and mode = 'exam'
      and source = 'TEST'
      and created_at >= date_trunc('week', now_tz)
      and created_at < date_trunc('week', now_tz) + interval '7 days';

    if free_this_week >= s.free_weekly_tests then
      raise exception 'Weekly free test limit exceeded (%/%)', free_this_week, s.free_weekly_tests;
    end if;
  end if;

  return new;
end $$;

-- Apply the trigger
drop trigger if exists enforce_premium_limits_on_quiz_attempts on public.quiz_attempts;
create trigger enforce_premium_limits_on_quiz_attempts
before insert on public.quiz_attempts
for each row execute function public.enforce_premium_limits();

-- ---------------------------------------------------------------------
-- 6. Admin functions for managing premium
-- ---------------------------------------------------------------------
create or replace function public.admin_grant_premium(p_user_id uuid, p_months int, p_amount numeric, p_source text, p_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_sub   uuid;
  v_pay   uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can give Premium';
  end if;

  v_start := greatest(now(), coalesce(public._premium_until(p_user_id), now()));
  v_end := v_start + interval '1 month' * p_months;

  insert into public.payments (user_id, plan, amount_paise, currency, status, source, method, note, created_by)
  values (p_user_id, 'yearly', round(p_amount * 100), 'INR', 'paid', p_source, p_method, 'Admin grant', p_user_id)
  returning id into v_pay;

  insert into public.subscriptions (user_id, plan, starts_at, ends_at, amount, source, method, note, payment_id, created_by)
  values (p_user_id, 'yearly', v_start, v_end, p_amount, p_source, p_method, 'Admin grant', v_pay, p_user_id)
  returning id into v_sub;

  return jsonb_build_object('ok', true, 'until', v_end, 'subscription', v_sub);
end $$;
revoke all on function public.admin_grant_premium(uuid, int, numeric, text, text) from public;
grant execute on function public.admin_grant_premium(uuid, int, numeric, text, text) to authenticated;

create or replace function public.admin_revoke_premium(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can remove Premium';
  end if;

  update public.subscriptions
     set ends_at = now()
   where user_id = p_user_id
     and plan = 'yearly'
     and ends_at > now();

  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_revoke_premium(uuid) from public;
grant execute on function public.admin_revoke_premium(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Leaderboard: ⭐ badge for premium members (paid or given, not trial)
-- ---------------------------------------------------------------------
drop function if exists public.leaderboard(text, int);
create function public.leaderboard(p_period text default 'weekly', p_limit int default 50)
returns table (rank int, display_name text, target_exam text, quizzes int, answered int, correct int,
               accuracy numeric, points numeric, is_me boolean, is_premium boolean)
language sql stable security definer set search_path = public as $$
  with bounds as (
    select (date_trunc(case p_period when 'daily' then 'day' when 'monthly' then 'month' else 'week' end,
                       now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as since
  ), agg as (
    select a.user_id,
           count(*)::int as quizzes,
           sum(coalesce(a.correct_count, 0) + coalesce(a.wrong_count, 0))::int as answered,
           sum(coalesce(a.correct_count, 0))::int as correct,
           round(sum(coalesce(a.score, 0)), 2) as points
    from public.quiz_attempts a, bounds b
    where a.status = 'submitted' and a.submitted_at >= b.since
    group by a.user_id
  ), ranked as (
    select dense_rank() over (order by g.points desc, g.correct desc, g.answered asc)::int as rank,
           public._display_name(p.full_name) as display_name, p.target_exam,
           g.quizzes, g.answered, g.correct,
           case when g.answered > 0 then round(100.0 * g.correct / g.answered, 1) end as accuracy,
           g.points, (g.user_id = auth.uid()) as is_me,
           (g.user_id = auth.uid() and public._premium_until(g.user_id) > now()) as is_premium
    from agg g join public.profiles p on p.id = g.user_id
    where p.role = 'student' and g.answered > 0
  )
  select * from ranked
  where rank <= least(greatest(coalesce(p_limit, 50), 1), 200) or is_me
  order by rank, display_name;
$$;
revoke all on function public.leaderboard(text, int) from public;
grant execute on function public.leaderboard(text, int) to anon, authenticated;