-- =====================================================================
-- Tests: "PYQ Full Length Test" and "Monthly MCQ Practice".
-- Run once in Supabase → SQL Editor (after 005_question_trash.sql).
--
-- * Each test has its own marking (+/−), time limit and number of questions.
-- * A test's questions are uploaded separately and are NOT mixed into the
--   normal topic-wise practice question bank.
-- * Students attempt a test in exam mode; results use the normal result page.
-- =====================================================================

create table if not exists public.tests (
  id              uuid primary key default gen_random_uuid(),
  category        text not null check (category in ('pyq_full', 'monthly')),
  title_en        text not null check (char_length(title_en) between 2 and 200),
  title_hi        text,
  description_en  text,
  description_hi  text,
  month           date,                       -- Monthly MCQ: any day of the month it covers
  question_limit  int check (question_limit is null or question_limit between 1 and 200),  -- null = all uploaded
  duration_min    int not null default 120 check (duration_min between 1 and 600),
  positive_marks  numeric(5,2) not null default 1     check (positive_marks > 0),
  negative_marks  numeric(5,2) not null default 0.33  check (negative_marks >= 0),
  is_published    boolean not null default false,
  sort_order      int not null default 0,
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tests_category_idx on public.tests (category, is_published, sort_order, created_at desc);

drop trigger if exists tests_touch on public.tests;
create trigger tests_touch before update on public.tests for each row execute function public.touch_updated_at();

alter table public.tests enable row level security;
drop policy if exists "tests: read published" on public.tests;
drop policy if exists "tests: admin write" on public.tests;
create policy "tests: read published" on public.tests for select using (is_published or public.is_admin());
create policy "tests: admin write" on public.tests for all using (public.is_admin()) with check (public.is_admin());

-- A question either belongs to the practice bank (test_id is null) or to one test.
alter table public.questions add column if not exists test_id uuid references public.tests(id) on delete restrict;
alter table public.questions add column if not exists test_position int;
create index if not exists questions_test_idx on public.questions (test_id, test_position) where test_id is not null;

-- ---------------------------------------------------------------------
-- Practice bank functions: leave test questions out
-- ---------------------------------------------------------------------
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
      -- test questions stay out of normal practice, but DO come back via Bookmarks / Mistake Notebook
      and (q.test_id is null or p_source in ('bookmarks', 'mistakes'))
      and (p_subject_ids is null or cardinality(p_subject_ids) = 0 or q.subject_id = any (p_subject_ids))
      and (p_topic_ids   is null or cardinality(p_topic_ids)   = 0 or q.topic_id   = any (p_topic_ids))
      and (p_exam_ids    is null or cardinality(p_exam_ids)    = 0 or q.exam_id    = any (p_exam_ids))
      and (
        p_source = 'all'
        or (p_source = 'bookmarks' and exists (select 1 from public.bookmarks b where b.user_id = auth.uid() and b.question_id = q.id))
        or (p_source = 'mistakes'  and exists (select 1 from public.mistakes  m where m.user_id = auth.uid() and m.question_id = q.id))
      )
      and (not p_high_priority_only or public.high_priority(q))
    order by random()
    limit least(greatest(coalesce(p_count, 20), 1), 150)
  ) s;
$$;

create or replace function public.count_questions(
  p_subject_ids int[] default null, p_topic_ids int[] default null, p_exam_ids int[] default null
) returns int language sql stable security invoker set search_path = public as $$
  select count(*)::int from public.questions q
  where not q.is_dropped and q.test_id is null
    and (p_subject_ids is null or cardinality(p_subject_ids) = 0 or q.subject_id = any (p_subject_ids))
    and (p_topic_ids   is null or cardinality(p_topic_ids)   = 0 or q.topic_id   = any (p_topic_ids))
    and (p_exam_ids    is null or cardinality(p_exam_ids)    = 0 or q.exam_id    = any (p_exam_ids));
$$;

create or replace function public.get_live_question_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.questions where not is_dropped and test_id is null;
$$;

-- ---------------------------------------------------------------------
-- Starting a test: the attempt takes its questions, marking and time from the test.
-- (Normal quizzes keep using Marking & settings.)
-- ---------------------------------------------------------------------
create or replace function public.quiz_attempts_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s public.app_settings;
  t public.tests;
  v_test uuid;
begin
  select * into s from public.app_settings where id = 1;
  new.user_id := auth.uid();
  new.status := 'in_progress';
  new.score := null; new.correct_count := null; new.wrong_count := null;
  new.skipped_count := null; new.submitted_at := null;

  v_test := nullif(new.config->>'test_id', '')::uuid;
  if v_test is not null then
    select * into t from public.tests where id = v_test and (is_published or public.is_admin());
    if not found then raise exception 'This test is not available'; end if;
    new.mode := 'exam';
    new.source := 'all';
    new.title := t.title_en;
    new.question_ids := array(
      select q.id from public.questions q
      where q.test_id = t.id and not q.is_dropped and q.deleted_at is null
      order by q.test_position nulls last, q.created_at, q.id
      limit coalesce(t.question_limit, 200));
    new.positive_marks := t.positive_marks;
    new.negative_marks := t.negative_marks;
    new.time_limit_sec := t.duration_min * 60;
    new.total_count := cardinality(new.question_ids);
    if cardinality(new.question_ids) < 1 then raise exception 'This test has no questions yet'; end if;
    return new;
  end if;

  new.positive_marks := s.positive_marks;
  new.negative_marks := s.negative_marks;
  new.time_limit_sec := case when new.mode = 'exam' then cardinality(new.question_ids) * s.seconds_per_question end;
  new.total_count := cardinality(new.question_ids);
  if cardinality(new.question_ids) < 1 or cardinality(new.question_ids) > 150 then
    raise exception 'A quiz must have between 1 and 150 questions';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Test list for students / home page (published only) with question counts
-- and the signed-in student's best score.
-- ---------------------------------------------------------------------
create or replace function public.list_tests(p_category text default null, p_limit int default 50)
returns table (
  id uuid, category text, title_en text, title_hi text, description_en text, description_hi text,
  month date, duration_min int, positive_marks numeric, negative_marks numeric,
  question_count int, my_attempts int, my_best numeric, my_last_attempt uuid, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select t.id, t.category, t.title_en, t.title_hi, t.description_en, t.description_hi,
         t.month, t.duration_min, t.positive_marks, t.negative_marks,
         least(coalesce(t.question_limit, 200),
               (select count(*) from public.questions q where q.test_id = t.id and not q.is_dropped and q.deleted_at is null))::int,
         (select count(*) from public.quiz_attempts a where a.user_id = auth.uid() and a.status = 'submitted' and a.config->>'test_id' = t.id::text)::int,
         (select max(a.score) from public.quiz_attempts a where a.user_id = auth.uid() and a.status = 'submitted' and a.config->>'test_id' = t.id::text),
         (select a.id from public.quiz_attempts a where a.user_id = auth.uid() and a.status = 'submitted' and a.config->>'test_id' = t.id::text order by a.submitted_at desc limit 1),
         t.created_at
  from public.tests t
  where t.is_published and (p_category is null or t.category = p_category)
  order by t.sort_order, coalesce(t.month, t.created_at::date) desc, t.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
revoke all on function public.list_tests(text, int) from public;
grant execute on function public.list_tests(text, int) to anon, authenticated;

-- Admin: all tests with uploaded / live question counts and attempts
create or replace function public.admin_list_tests()
returns table (id uuid, category text, title_en text, is_published boolean, month date, duration_min int,
               positive_marks numeric, negative_marks numeric, question_limit int,
               uploaded int, live int, attempts int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select t.id, t.category, t.title_en, t.is_published, t.month, t.duration_min, t.positive_marks, t.negative_marks, t.question_limit,
         (select count(*) from public.questions q where q.test_id = t.id and q.deleted_at is null)::int,
         (select count(*) from public.questions q where q.test_id = t.id and q.deleted_at is null and not q.is_dropped)::int,
         (select count(*) from public.quiz_attempts a where a.status = 'submitted' and a.config->>'test_id' = t.id::text)::int,
         t.created_at
  from public.tests t
  order by t.category, t.sort_order, t.created_at desc;
end $$;
revoke all on function public.admin_list_tests() from public, anon;
grant execute on function public.admin_list_tests() to authenticated;
