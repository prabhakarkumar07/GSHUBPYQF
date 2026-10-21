-- =====================================================================
-- Challenge rooms: create a challenge BEFORE starting a quiz/test, share the
-- link, everyone (2, 4, 5 … friends) takes the same questions, and all scores
-- are compared on one scoreboard.
-- Attempts in a room store config.challenge_id = <room id>.
-- Equivalent to reference 010_challenge_rooms.sql
-- Safe to run multiple times (uses IF NOT EXISTS, CREATE OR REPLACE)
-- =====================================================================

create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  mode         text not null default 'exam' check (mode in ('practice', 'exam')),
  question_ids uuid[] not null default '{}',
  test_id      uuid references public.tests(id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (test_id is not null or cardinality(question_ids) between 1 and 150)
);
create index if not exists challenges_creator_idx on public.challenges (created_by, created_at desc);

alter table public.challenges enable row level security;
drop policy if exists "challenges: create own" on public.challenges;
drop policy if exists "challenges: read own" on public.challenges;
create policy "challenges: create own" on public.challenges for insert with check (created_by = auth.uid());
create policy "challenges: read own" on public.challenges for select using (created_by = auth.uid() or public.is_admin());

-- Room details for the share page (public: no personal data except a short name)
create or replace function public.get_challenge_room(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'mode', c.mode, 'test_id', c.test_id,
    'question_ids', to_jsonb(c.question_ids),
    'total', case when c.test_id is null then cardinality(c.question_ids)
                  else (select least(coalesce(t.question_limit, 200), count(q.*))::int
                          from public.tests t left join public.questions q on q.test_id = t.id and not q.is_dropped and q.deleted_at is null
                         where t.id = c.test_id group by t.question_limit) end,
    'duration_min', (select t.duration_min from public.tests t where t.id = c.test_id),
    'creator', public._display_name(p.full_name), 'is_mine', c.created_by = auth.uid(),
    'my_attempt', (select a.id from public.quiz_attempts a where a.user_id = auth.uid() and a.config->>'challenge_id' = c.id::text
                   order by (a.status = 'submitted') desc, a.started_at limit 1),
    'my_status', (select a.status from public.quiz_attempts a where a.user_id = auth.uid() and a.config->>'challenge_id' = c.id::text
                  order by (a.status = 'submitted') desc, a.started_at limit 1),
    'created_at', c.created_at)
  from public.challenges c join public.profiles p on p.id = c.created_by
  where c.id = p_id;
$$;
revoke all on function public.get_challenge_room(uuid) from public;
grant execute on function public.get_challenge_room(uuid) to anon, authenticated;

-- Everyone in the room: first submitted attempt per person (or "playing" if not finished yet)
create or replace function public.challenge_room_scoreboard(p_id uuid)
returns table (user_key text, display_name text, status text, score numeric, max_score numeric, correct int, wrong int,
               time_taken_sec int, is_creator boolean, is_me boolean, attempt_id uuid)
language sql stable security definer set search_path = public as $$
  with per_user as (
    select distinct on (a.user_id) a.*
    from public.quiz_attempts a
    where a.config->>'challenge_id' = p_id::text
    order by a.user_id, (a.status = 'submitted') desc, a.submitted_at nulls last, a.started_at
  )
  select md5(u.user_id::text), public._display_name(p.full_name), u.status, u.score,
         round(u.total_count * u.positive_marks, 2), u.correct_count, u.wrong_count, u.time_taken_sec,
         u.user_id = (select created_by from public.challenges where id = p_id), u.user_id = auth.uid(),
         case when u.user_id = auth.uid() then u.id end
  from per_user u join public.profiles p on p.id = u.user_id
  order by (u.status = 'submitted') desc, u.score desc nulls last, u.time_taken_sec asc nulls last
  limit 100;
$$;
revoke all on function public.challenge_room_scoreboard(uuid) from public;
grant execute on function public.challenge_room_scoreboard(uuid) to anon, authenticated;