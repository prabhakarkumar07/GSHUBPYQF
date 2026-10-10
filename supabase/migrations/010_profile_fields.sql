-- =====================================================================
-- Student profile: mobile number + exam they are preparing for.
-- Run once in Supabase → SQL Editor (after 003_admin_results.sql).
-- =====================================================================

alter table public.profiles add column if not exists target_exam text
  check (target_exam is null or char_length(target_exam) <= 60);
alter table public.profiles add column if not exists phone text;

-- New sign-ups: copy name, mobile and exam from the sign-up form.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, target_exam)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), new.phone),
    nullif(new.raw_user_meta_data->>'target_exam', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Students may edit their own name, mobile, exam and language (not their role).
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, preferred_lang, target_exam) on public.profiles to authenticated;

-- Admin user list now includes mobile + exam, with an exam filter.
drop function if exists public.admin_list_students(text, int, int);
create or replace function public.admin_list_students(
  p_search text default null,
  p_exam   text default null,
  p_limit  int  default 50,
  p_offset int  default 0
) returns table (
  user_id uuid, full_name text, email text, phone text, target_exam text, role text, joined_at timestamptz,
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
  select u.id, p.full_name, u.email::text, coalesce(p.phone, u.phone)::text, p.target_exam, p.role, u.created_at,
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
  where (p_exam is null or p_exam = '' or p.target_exam = p_exam)
    and (p_search is null or p_search = ''
         or p.full_name ilike '%' || p_search || '%'
         or u.email ilike '%' || p_search || '%'
         or coalesce(p.phone, u.phone) ilike '%' || p_search || '%')
  order by u.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Count of users per exam (for the filter chips on the admin page).
create or replace function public.admin_exam_counts()
returns table (target_exam text, users bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query select coalesce(p.target_exam, '—'), count(*) from public.profiles p group by 1 order by 2 desc;
end $$;

revoke all on function public.admin_list_students(text, text, int, int) from public, anon;
revoke all on function public.admin_exam_counts() from public, anon;
grant execute on function public.admin_list_students(text, text, int, int) to authenticated;
grant execute on function public.admin_exam_counts() to authenticated;
