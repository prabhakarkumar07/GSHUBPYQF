-- =====================================================================
-- Admin: see which students attempted which quiz and what they scored.
-- Run once in Supabase → SQL Editor (after 001 and 002).
-- All functions check is_admin(); students cannot call them.
-- =====================================================================

-- Every quiz attempt with the student's name, email and score.
create or replace function public.admin_list_attempts(
  p_search  text default null,   -- name / email / quiz title
  p_mode    text default null,   -- 'practice' | 'exam' | null = both
  p_status  text default 'submitted', -- 'submitted' | 'in_progress' | null = all
  p_user    uuid default null,   -- only this student
  p_limit   int  default 50,
  p_offset  int  default 0
) returns table (
  attempt_id uuid, user_id uuid, full_name text, email text, phone text,
  title text, mode text, status text, score numeric, max_score numeric,
  total_count int, correct_count int, wrong_count int, skipped_count int,
  accuracy numeric, time_taken_sec int, started_at timestamptz, submitted_at timestamptz,
  total_rows bigint
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select a.id, a.user_id, p.full_name, u.email::text, coalesce(p.phone, u.phone)::text,
         a.title, a.mode, a.status, a.score, (a.total_count * a.positive_marks)::numeric,
         a.total_count, a.correct_count, a.wrong_count, a.skipped_count,
         case when coalesce(a.correct_count, 0) + coalesce(a.wrong_count, 0) > 0
              then round(100.0 * a.correct_count / (a.correct_count + a.wrong_count), 1) end,
         a.time_taken_sec, a.started_at, a.submitted_at,
         count(*) over ()
  from public.quiz_attempts a
  join auth.users u on u.id = a.user_id
  left join public.profiles p on p.id = a.user_id
  where (p_mode is null or a.mode = p_mode)
    and (p_status is null or a.status = p_status)
    and (p_user is null or a.user_id = p_user)
    and (p_search is null or p_search = ''
         or p.full_name ilike '%' || p_search || '%'
         or u.email ilike '%' || p_search || '%'
         or a.title ilike '%' || p_search || '%')
  order by coalesce(a.submitted_at, a.started_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- One row per student: how many quizzes, accuracy, last active.
create or replace function public.admin_list_students(
  p_search text default null,
  p_limit  int  default 50,
  p_offset int  default 0
) returns table (
  user_id uuid, full_name text, email text, phone text, role text, joined_at timestamptz,
  quizzes int, questions_answered int, accuracy numeric, avg_score_pct numeric,
  mistakes int, last_active timestamptz, total_rows bigint
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  with att as (
    select a.user_id,
           count(*) filter (where a.status = 'submitted')::int as quizzes,
           sum(coalesce(a.correct_count, 0) + coalesce(a.wrong_count, 0))::int as answered,
           sum(coalesce(a.correct_count, 0))::int as correct,
           avg(case when a.status = 'submitted' and a.total_count > 0
                    then 100.0 * a.score / (a.total_count * a.positive_marks) end) as avg_pct,
           max(coalesce(a.submitted_at, a.updated_at)) as last_active
    from public.quiz_attempts a group by a.user_id
  ), mis as (
    select m.user_id, count(*)::int as n from public.mistakes m group by m.user_id
  )
  select u.id, p.full_name, u.email::text, coalesce(p.phone, u.phone)::text, p.role, u.created_at,
         coalesce(att.quizzes, 0), coalesce(att.answered, 0),
         case when coalesce(att.answered, 0) > 0 then round(100.0 * att.correct / att.answered, 1) end,
         round(att.avg_pct, 1),
         coalesce(mis.n, 0),
         coalesce(att.last_active, u.last_sign_in_at),
         count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join att on att.user_id = u.id
  left join mis on mis.user_id = u.id
  where (p_search is null or p_search = ''
         or p.full_name ilike '%' || p_search || '%'
         or u.email ilike '%' || p_search || '%')
  order by coalesce(att.last_active, u.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Question-by-question answers of one attempt.
create or replace function public.admin_attempt_detail(p_attempt uuid)
returns table (
  q_no int, question_id uuid, question_en text, subject text, topic text,
  selected_option text, correct_option text, is_correct boolean
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select o.pos::int, q.id, left(regexp_replace(q.question_en, '<[^>]+>', ' ', 'g'), 200),
         s.name_en, t.name_en,
         coalesce(aa.selected_option, a.responses -> q.id::text ->> 'selected'),
         q.correct_option,
         aa.is_correct
  from public.quiz_attempts a
  cross join lateral unnest(a.question_ids) with ordinality as o(qid, pos)
  join public.questions q on q.id = o.qid
  left join public.subjects s on s.id = q.subject_id
  left join public.topics t on t.id = q.topic_id
  left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = q.id
  where a.id = p_attempt
  order by o.pos;
end $$;

revoke all on function public.admin_list_attempts(text, text, text, uuid, int, int) from public, anon;
revoke all on function public.admin_list_students(text, int, int) from public, anon;
revoke all on function public.admin_attempt_detail(uuid) from public, anon;
grant execute on function public.admin_list_attempts(text, text, text, uuid, int, int) to authenticated;
grant execute on function public.admin_list_students(text, int, int) to authenticated;
grant execute on function public.admin_attempt_detail(uuid) to authenticated;
