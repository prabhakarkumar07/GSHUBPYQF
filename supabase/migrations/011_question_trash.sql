-- =====================================================================
-- "Deleted" folder (recycle bin) for questions.
-- Run once in Supabase → SQL Editor (after 004_profile_fields.sql).
--
-- Deleting a question now only moves it to the Deleted folder:
--   * it is hidden from students at once (it is marked dropped while deleted),
--   * students' answers, bookmarks and notebook entries are kept,
--   * it can be restored exactly as it was,
--   * "Delete permanently" is only possible from the Deleted folder.
-- At most 300 questions can be moved / restored / purged in one action.
-- =====================================================================

alter table public.questions add column if not exists deleted_at timestamptz;
alter table public.questions add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.questions add column if not exists dropped_before_delete boolean;
create index if not exists questions_deleted_at_idx on public.questions (deleted_at) where deleted_at is not null;

-- Move to the Deleted folder
create or replace function public.admin_trash_questions(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 300 then raise exception 'You can delete at most 300 questions at a time'; end if;
  update public.questions
     set dropped_before_delete = is_dropped, is_dropped = true, deleted_at = now(), deleted_by = auth.uid()
   where id = any(p_ids) and deleted_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- Restore from the Deleted folder
create or replace function public.admin_restore_questions(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 300 then raise exception 'You can restore at most 300 questions at a time'; end if;
  update public.questions
     set is_dropped = coalesce(dropped_before_delete, false), dropped_before_delete = null, deleted_at = null, deleted_by = null
   where id = any(p_ids) and deleted_at is not null;
  get diagnostics n = row_count;
  return n;
end $$;

-- Delete permanently (only questions already in the Deleted folder)
create or replace function public.admin_purge_questions(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 300 then raise exception 'You can permanently delete at most 300 questions at a time'; end if;
  delete from public.questions where id = any(p_ids) and deleted_at is not null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.admin_trash_questions(uuid[]) from public, anon;
revoke all on function public.admin_restore_questions(uuid[]) from public, anon;
revoke all on function public.admin_purge_questions(uuid[]) from public, anon;
grant execute on function public.admin_trash_questions(uuid[]) to authenticated;
grant execute on function public.admin_restore_questions(uuid[]) to authenticated;
grant execute on function public.admin_purge_questions(uuid[]) to authenticated;

-- Safety net: direct deletes (from the app) are only allowed for questions already in the Deleted folder.
drop policy if exists "questions: admin write" on public.questions;
drop policy if exists "questions: admin insert" on public.questions;
drop policy if exists "questions: admin update" on public.questions;
drop policy if exists "questions: admin delete trashed" on public.questions;
create policy "questions: admin insert" on public.questions for insert with check (public.is_admin());
create policy "questions: admin update" on public.questions for update using (public.is_admin()) with check (public.is_admin());
create policy "questions: admin delete trashed" on public.questions for delete using (public.is_admin() and deleted_at is not null);
