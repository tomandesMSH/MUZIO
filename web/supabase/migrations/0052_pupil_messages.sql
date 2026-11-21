-- Hudební pošta: a teacher writes to one pupil (the class announcements in
-- 0041 go to a whole class). The pupil sees it on the dashboard and gets a
-- notification (api/notify.ts, type 'message'); "Přečteno" marks it read,
-- and the teacher sees whether it was read.
--
-- Needs teacher_has_pupil (0039). Run this manually in the Supabase SQL
-- editor. Safe to run twice.

create table if not exists pupil_messages (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists pupil_messages_student on pupil_messages(student_id, created_at desc);
create index if not exists pupil_messages_teacher on pupil_messages(teacher_id, student_id, created_at desc);

alter table pupil_messages enable row level security;

-- The teacher writes to their own pupils, reads and deletes what they wrote.
drop policy if exists "Ucitel pise svym zakum" on pupil_messages;
create policy "Ucitel pise svym zakum" on pupil_messages
  for insert with check (
    teacher_id = auth.uid() and read_at is null and is_admin() and teacher_has_pupil(auth.uid(), student_id)
  );

drop policy if exists "Ucitel cte sve zpravy" on pupil_messages;
create policy "Ucitel cte sve zpravy" on pupil_messages
  for select using (teacher_id = auth.uid() or is_moderator());

drop policy if exists "Ucitel maze sve zpravy" on pupil_messages;
create policy "Ucitel maze sve zpravy" on pupil_messages
  for delete using (teacher_id = auth.uid());

-- The pupil reads their own; marking read goes through the function below.
drop policy if exists "Zak cte svou postu" on pupil_messages;
create policy "Zak cte svou postu" on pupil_messages
  for select using (student_id = auth.uid());

create or replace function mark_message_read(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $function$
  update pupil_messages set read_at = now()
  where id = p_id and student_id = auth.uid() and read_at is null
$function$;

revoke execute on function mark_message_read(uuid) from public, anon;
grant execute on function mark_message_read(uuid) to authenticated;
