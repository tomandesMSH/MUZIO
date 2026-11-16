-- Quality-of-life additions (one migration for four features):
--   1. practice_logs.student_note   - a short note from the pupil to the teacher
--   2. assignments.due_date         - an optional deadline
--   3. practice_logs.feedback_seen_at + mark_feedback_seen()
--                                   - "new grade" dot for the pupil
--   4. comment_snippets             - the teacher's saved grading phrases
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

-- 1. Note from the pupil, written with the recording (the insert policy
--    already lets pupils write their own rows).
alter table practice_logs add column if not exists student_note text;
alter table practice_logs drop constraint if exists practice_logs_student_note_length;
alter table practice_logs add constraint practice_logs_student_note_length
  check (student_note is null or char_length(student_note) <= 300);

-- 2. Deadline (a day, no time). Null = no deadline.
alter table assignments add column if not exists due_date date;

-- 3. When the pupil opened their graded recording. Pupils can't update their
--    rows directly, so they mark them seen through this function - only their
--    own, only graded ones.
alter table practice_logs add column if not exists feedback_seen_at timestamptz;

create or replace function mark_feedback_seen(p_ids bigint[])
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;
  update practice_logs
     set feedback_seen_at = now()
   where id = any(p_ids)
     and user_id = auth.uid()
     and rating is not null
     and feedback_seen_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke execute on function mark_feedback_seen(bigint[]) from public, anon;
grant execute on function mark_feedback_seen(bigint[]) to authenticated;

-- A changed grade is new again for the pupil.
create or replace function practice_logs_regrade_unseen()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.rating is distinct from old.rating
     or new.feedback_good is distinct from old.feedback_good
     or new.feedback_improve is distinct from old.feedback_improve then
    new.feedback_seen_at := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists practice_logs_regrade_unseen on practice_logs;
create trigger practice_logs_regrade_unseen
  before update on practice_logs
  for each row
  execute function practice_logs_regrade_unseen();

-- Grades given before this migration count as seen (no flood of dots).
update practice_logs set feedback_seen_at = now() where rating is not null and feedback_seen_at is null;

-- 4. The teacher's saved phrases for "Co se povedlo" / "Co zlepšit".
create table if not exists comment_snippets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  -- Which field it goes into: "Co se povedlo" (good) or "Co zlepšit" (improve).
  kind text not null default 'good' check (kind in ('good', 'improve')),
  text text not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists comment_snippets_teacher on comment_snippets(teacher_id);

alter table comment_snippets enable row level security;

drop policy if exists "Vlastni rychle vety" on comment_snippets;
create policy "Vlastni rychle vety" on comment_snippets
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
