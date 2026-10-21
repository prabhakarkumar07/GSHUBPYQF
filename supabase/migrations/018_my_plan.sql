-- =====================================================================
-- Migration: my_plan() RPC
-- Returns the current user's full plan status in a single round-trip.
-- Works with Clerk JWTs: auth.uid() returns the Clerk user ID (text).
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE).
-- =====================================================================

-- Ensure plan_settings exists (idempotent — also created in 016_freemium.sql)
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

-- Add trial_until to profiles if missing (referenced in _premium_until but never migrated)
alter table public.profiles
  add column if not exists trial_until timestamptz;

-- Ensure subscriptions table exists (idempotent — also created in 016_freemium.sql)
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  plan            text not null check (plan in ('monthly', 'yearly')),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  amount          numeric(8,2) not null check (amount > 0),
  source          text not null,
  method          text not null,
  note            text,
  payment_id      uuid,
  created_by      text,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- my_plan() — single-row plan status for the calling user
-- -----------------------------------------------------------------------
create or replace function public.my_plan()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with
    -- Use auth.jwt() ->> 'sub' to get the raw Clerk user ID (e.g. "user_xxx") as text.
    -- auth.uid() internally casts sub → uuid, which fails for non-UUID Clerk IDs.
    me as (
      select auth.jwt() ->> 'sub' as uid
    ),
    s as (
      select * from public.plan_settings where id = 1
    ),
    prof as (
      select
        p.role,
        p.trial_until
      from public.profiles p, me
      where p.id = me.uid
    ),
    -- Active subscription (most recent ending furthest in the future)
    sub as (
      select
        sb.ends_at,
        sb.plan
      from public.subscriptions sb, me
      where sb.user_id = me.uid
        and sb.ends_at > now()
      order by sb.ends_at desc
      limit 1
    ),
    -- Is the user currently premium (paid subscription or active trial)?
    premium_status as (
      select
        case
          when (select ends_at from sub) is not null then true
          when (select trial_until from prof) > now() then true
          else false
        end as is_premium,
        case
          when (select ends_at from sub) is not null then true
          else false
        end as is_paid,
        case
          when (select ends_at from sub) is null
            and (select trial_until from prof) > now() then true
          else false
        end as is_trial
    ),
    -- Is the user a staff member (admin / super_admin)?
    staff as (
      select coalesce((select role from prof), '') in ('admin', 'super_admin') as is_staff
    ),
    -- IST date-bound usage counters
    usage as (
      select
        count(*) filter (
          where qa.mode in ('practice', 'exam')
            and qa.source = 'PYQ'
            and qa.started_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'
            and qa.started_at <  (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '1 day') at time zone 'Asia/Kolkata'
        )::int as questions_used_today,
        count(*) filter (
          where qa.mode = 'exam'
            and qa.source = 'TEST'
            and qa.started_at >= date_trunc('week', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'
            and qa.started_at <  (date_trunc('week', now() at time zone 'Asia/Kolkata') + interval '7 days') at time zone 'Asia/Kolkata'
        )::int as tests_used_week
      from public.quiz_attempts qa, me
      where qa.user_id = me.uid
    )
  select jsonb_build_object(
    'enabled',              (select enabled from s),
    'signed_in',            (select uid from me) is not null,
    'is_premium',           (select is_premium from premium_status) or (select is_staff from staff),
    'is_paid',              (select is_paid   from premium_status),
    'is_trial',             (select is_trial  from premium_status),
    'is_staff',             (select is_staff  from staff),
    'premium_until',        coalesce(
                              (select ends_at from sub),
                              (select trial_until from prof)
                            ),
    'trial_until',          (select trial_until from prof),
    'plan',                 (select plan from sub),
    'free_daily_questions', (select free_daily_questions from s),
    'free_weekly_tests',    (select free_weekly_tests    from s),
    'price_monthly',        (select price_monthly        from s),
    'price_yearly',         (select price_yearly         from s),
    'trial_days',           (select trial_days           from s),
    'questions_used_today', (select questions_used_today from usage),
    'tests_used_week',      (select tests_used_week      from usage),
    'questions_left_today', case
                              when (select is_premium from premium_status) or (select is_staff from staff)
                                    or not (select enabled from s)
                              then null
                              else greatest(0, (select free_daily_questions from s) - (select questions_used_today from usage))
                            end,
    'tests_left_week',      case
                              when (select is_premium from premium_status) or (select is_staff from staff)
                                    or not (select enabled from s)
                              then null
                              else greatest(0, (select free_weekly_tests from s) - (select tests_used_week from usage))
                            end
  );
$$;

revoke all on function public.my_plan() from public;
grant execute on function public.my_plan() to anon, authenticated;
