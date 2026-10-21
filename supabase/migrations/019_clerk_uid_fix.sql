-- =====================================================================
-- Migration: Clerk UID fix — project-wide
--
-- auth.uid() internally casts the JWT 'sub' claim to uuid.
-- Clerk user IDs (e.g. "user_3KTQE61rw90rxjPx6hu9b7H75yX") are text strings,
-- so any call to auth.uid() throws error 22P02 (invalid input syntax for type uuid).
--
-- This script:
-- 1. Creates clerk_uid() helper returning auth.jwt() ->> 'sub' (raw text)
-- 2. Updates is_admin() to compare text ID against clerk_uid()
-- 3. Updates RLS policies on core tables (profiles, quiz_attempts, attempt_answers,
--    mistakes, bookmarks, feedback)
-- 4. Updates core RPC functions (quiz_attempts_before_insert, record_practice_answer,
--    submit_attempt, build_quiz, get_my_accuracy, get_my_mistake_summary)
--
-- Safe to run multiple times and does not depend on optional tables (like tests).
-- =====================================================================

-- -------------------------------------------------------------------
-- 0. Helper: clerk_uid() — returns the raw JWT sub claim as text
-- -------------------------------------------------------------------
create or replace function public.clerk_uid()
returns text
language sql stable
security definer
set search_path = public
as $$
  select auth.jwt() ->> 'sub';
$$;
revoke all on function public.clerk_uid() from public;
grant execute on function public.clerk_uid() to anon, authenticated;

-- -------------------------------------------------------------------
-- 1. Admin helper functions
-- -------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = public.clerk_uid()
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = public.clerk_uid()
      and role = 'super_admin'
  );
$$;

-- -------------------------------------------------------------------
-- 2. Core RLS Policies: Profiles
-- -------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  using (id = public.clerk_uid() or public.is_admin());

create policy "profiles: update own"
  on public.profiles for update
  using (id = public.clerk_uid())
  with check (id = public.clerk_uid());

-- -------------------------------------------------------------------
-- 3. Core RLS Policies: Quiz Attempts
-- -------------------------------------------------------------------
alter table public.quiz_attempts enable row level security;
drop policy if exists "attempts: read own"                on public.quiz_attempts;
drop policy if exists "attempts: insert own"              on public.quiz_attempts;
drop policy if exists "attempts: update own in-progress"  on public.quiz_attempts;
drop policy if exists "attempts: delete own"              on public.quiz_attempts;

create policy "attempts: read own"
  on public.quiz_attempts for select
  using (user_id = public.clerk_uid());

create policy "attempts: insert own"
  on public.quiz_attempts for insert
  with check (public.clerk_uid() is not null);

create policy "attempts: update own in-progress"
  on public.quiz_attempts for update
  using  (user_id = public.clerk_uid() and status = 'in_progress')
  with check (user_id = public.clerk_uid() and status = 'in_progress');

create policy "attempts: delete own"
  on public.quiz_attempts for delete
  using (user_id = public.clerk_uid());

-- -------------------------------------------------------------------
-- 4. Core RLS Policies: Attempt Answers, Mistakes, Bookmarks, Feedback
-- -------------------------------------------------------------------
alter table public.attempt_answers enable row level security;
drop policy if exists "answers: read own" on public.attempt_answers;
create policy "answers: read own"
  on public.attempt_answers for select
  using (user_id = public.clerk_uid());

alter table public.mistakes enable row level security;
drop policy if exists "mistakes: read own"   on public.mistakes;
drop policy if exists "mistakes: delete own" on public.mistakes;
create policy "mistakes: read own"
  on public.mistakes for select
  using (user_id = public.clerk_uid());
create policy "mistakes: delete own"
  on public.mistakes for delete
  using (user_id = public.clerk_uid());

alter table public.bookmarks enable row level security;
drop policy if exists "bookmarks: own" on public.bookmarks;
create policy "bookmarks: own"
  on public.bookmarks for all
  using (user_id = public.clerk_uid())
  with check (user_id = public.clerk_uid());

alter table public.feedback enable row level security;
drop policy if exists "feedback: submit" on public.feedback;
create policy "feedback: submit"
  on public.feedback for insert
  with check (user_id is null or user_id = public.clerk_uid());

-- -------------------------------------------------------------------
-- 5. Trigger: quiz_attempts_before_insert (Core schema compatible)
-- -------------------------------------------------------------------
create or replace function public.quiz_attempts_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
begin
  select * into s from public.app_settings where id = 1;
  new.user_id        := coalesce(new.user_id, public.clerk_uid());
  new.positive_marks := coalesce(new.positive_marks, s.positive_marks, 1);
  new.negative_marks := coalesce(new.negative_marks, s.negative_marks, 0.33);
  new.time_limit_sec := case when new.mode = 'exam'
                             then cardinality(new.question_ids) * coalesce(s.seconds_per_question, 48)
                        end;
  new.status := 'in_progress';
  new.score := null;
  new.correct_count := null;
  new.wrong_count := null;
  new.skipped_count := null;
  new.submitted_at := null;
  new.total_count := cardinality(new.question_ids);

  if cardinality(new.question_ids) < 1 or cardinality(new.question_ids) > 150 then
    raise exception 'A quiz must have between 1 and 150 questions';
  end if;
  return new;
end $$;

-- -------------------------------------------------------------------
-- 6. RPC: record_practice_answer
-- -------------------------------------------------------------------
create or replace function public.record_practice_answer(p_attempt uuid, p_question uuid, p_selected text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.quiz_attempts;
  v_effect text;
  v_correct text;
begin
  select * into a from public.quiz_attempts where id = p_attempt;
  if a.id is null or a.user_id <> public.clerk_uid() then
    raise exception 'Attempt not found';
  end if;
  if a.status <> 'in_progress' or a.mode <> 'practice' then
    raise exception 'Attempt is not an open practice quiz';
  end if;
  if not (p_question = any (a.question_ids)) then
    raise exception 'Question not in this quiz';
  end if;

  v_effect := public._apply_answer(p_attempt, a.user_id, p_question, p_selected);
  update public.quiz_attempts
     set responses = responses || jsonb_build_object(p_question::text, jsonb_build_object('selected', p_selected))
   where id = p_attempt;
  select correct_option into v_correct from public.questions where id = p_question;
  return jsonb_build_object('is_correct', p_selected = v_correct, 'correct_option', v_correct, 'effect', v_effect);
end $$;

-- -------------------------------------------------------------------
-- 7. RPC: submit_attempt
-- -------------------------------------------------------------------
create or replace function public.submit_attempt(p_attempt uuid, p_responses jsonb, p_time_taken int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.quiz_attempts;
  qid uuid;
  v_correct int;
  v_wrong int;
  v_total int;
  v_score numeric;
begin
  select * into a from public.quiz_attempts where id = p_attempt for update;
  if a.id is null or a.user_id <> public.clerk_uid() then
    raise exception 'Attempt not found';
  end if;
  if a.status = 'submitted' then
    return jsonb_build_object('already_submitted', true, 'score', a.score);
  end if;

  foreach qid in array a.question_ids loop
    perform public._apply_answer(p_attempt, a.user_id, qid, p_responses -> qid::text ->> 'selected');
  end loop;

  select count(*) filter (where is_correct), count(*) filter (where not is_correct)
    into v_correct, v_wrong
    from public.attempt_answers where attempt_id = p_attempt;
  v_total := cardinality(a.question_ids);
  v_score := round(v_correct * a.positive_marks - v_wrong * a.negative_marks, 2);

  update public.quiz_attempts set
    responses      = coalesce(p_responses, responses),
    status         = 'submitted',
    submitted_at   = now(),
    time_taken_sec = greatest(0, least(extract(epoch from (now() - started_at))::int, 86400)),
    correct_count  = v_correct,
    wrong_count    = v_wrong,
    skipped_count  = v_total - v_correct - v_wrong,
    total_count    = v_total,
    score          = v_score
  where id = p_attempt;

  return jsonb_build_object('score', v_score, 'correct', v_correct, 'wrong', v_wrong,
                            'skipped', v_total - v_correct - v_wrong, 'total', v_total);
end $$;

-- -------------------------------------------------------------------
-- 8. RPC: build_quiz
-- -------------------------------------------------------------------
create or replace function public.build_quiz(
  p_subject_ids int[] default null,
  p_topic_ids   int[] default null,
  p_exam_ids    int[] default null,
  p_count       int   default 20,
  p_source      text  default 'all',
  p_high_priority_only boolean default false
) returns uuid[] language sql stable security invoker set search_path = public as $$
  select coalesce(array_agg(id), '{}') from (
    select q.id
    from public.questions q
    where not q.is_dropped
      and (p_subject_ids is null or cardinality(p_subject_ids) = 0 or q.subject_id = any (p_subject_ids))
      and (p_topic_ids   is null or cardinality(p_topic_ids)   = 0 or q.topic_id   = any (p_topic_ids))
      and (p_exam_ids    is null or cardinality(p_exam_ids)    = 0 or q.exam_id    = any (p_exam_ids))
      and (
        p_source = 'all'
        or (p_source = 'bookmarks' and exists (select 1 from public.bookmarks b where b.user_id = public.clerk_uid() and b.question_id = q.id))
        or (p_source = 'mistakes'  and exists (select 1 from public.mistakes  m where m.user_id = public.clerk_uid() and m.question_id = q.id))
      )
      and (not p_high_priority_only or public.high_priority(q))
    order by random()
    limit least(greatest(coalesce(p_count, 20), 1), 150)
  ) s;
$$;

-- -------------------------------------------------------------------
-- 9. RPC: get_my_accuracy & get_my_mistake_summary
-- -------------------------------------------------------------------
create or replace function public.get_my_accuracy()
returns table (subject_id int, topic_id int, attempted int, correct int)
language sql stable security invoker set search_path = public as $$
  select q.subject_id, q.topic_id, count(*)::int, count(*) filter (where aa.is_correct)::int
  from public.attempt_answers aa
  join public.questions q on q.id = aa.question_id
  where aa.user_id = public.clerk_uid()
  group by q.subject_id, q.topic_id;
$$;

create or replace function public.get_my_mistake_summary()
returns table (subject_id int, topic_id int, mistakes int, high_priority int)
language sql stable security invoker set search_path = public as $$
  select q.subject_id, q.topic_id, count(*)::int, count(*) filter (where public.high_priority(q))::int
  from public.mistakes m
  join public.questions q on q.id = m.question_id
  where m.user_id = public.clerk_uid()
  group by q.subject_id, q.topic_id;
$$;

-- -------------------------------------------------------------------
-- 10. Optional tables policies (Applied conditionally only if tables exist)
-- -------------------------------------------------------------------
do $$
begin
  -- payments
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments') then
    execute 'alter table public.payments enable row level security';
    execute 'drop policy if exists "payments: own read" on public.payments';
    execute 'create policy "payments: own read" on public.payments for select using (user_id = public.clerk_uid() or public.is_super_admin())';
  end if;

  -- subscriptions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'subscriptions') then
    execute 'alter table public.subscriptions enable row level security';
    execute 'drop policy if exists "subscriptions: own read" on public.subscriptions';
    execute 'create policy "subscriptions: own read" on public.subscriptions for select using (user_id = public.clerk_uid() or public.is_super_admin())';
  end if;

  -- challenges
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'challenges') then
    execute 'alter table public.challenges enable row level security';
    execute 'drop policy if exists "challenges: public read" on public.challenges';
    execute 'drop policy if exists "challenges: creator insert" on public.challenges';
    execute 'drop policy if exists "challenges: update" on public.challenges';
    execute 'create policy "challenges: public read" on public.challenges for select using (true)';
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'challenges' and column_name = 'creator_id') then
      execute 'create policy "challenges: creator insert" on public.challenges for insert with check (creator_id = public.clerk_uid())';
      execute 'create policy "challenges: update" on public.challenges for update using (creator_id = public.clerk_uid() or opponent_id = public.clerk_uid())';
    end if;
  end if;
end $$;
