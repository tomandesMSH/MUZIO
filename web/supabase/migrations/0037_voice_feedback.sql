-- 1. Deleting an assignment keeps the recordings made for it (they just stop
--    pointing at it). Until now the foreign key had no ON DELETE, so an
--    assignment with recordings couldn't be deleted at all.
-- 2. Voice feedback: the teacher records a short spoken comment (or plays the
--    bar correctly) with the grade; the pupil plays it back.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

-- 1.
alter table practice_logs drop constraint if exists practice_logs_assignment_id_fkey;
alter table practice_logs
  add constraint practice_logs_assignment_id_fkey
  foreign key (assignment_id) references assignments(id) on delete set null;

-- 2. Storage path of the comment, "<practice_log_id>/<file>" in feedback-audio.
alter table practice_logs add column if not exists feedback_audio text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-audio', 'feedback-audio', false, 5242880,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac']
)
on conflict (id) do nothing;

-- Same rules as the feedback pictures (0026): whoever sees the recording hears
-- the comment; teachers and moderators add and remove them.
drop policy if exists "Hlasovy komentar slysi, kdo vidi nahravku" on storage.objects;
create policy "Hlasovy komentar slysi, kdo vidi nahravku" on storage.objects
  for select
  using (
    bucket_id = 'feedback-audio'
    and exists (
      select 1 from public.practice_logs pl
      where pl.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Ucitel nahrava hlasovy komentar" on storage.objects;
create policy "Ucitel nahrava hlasovy komentar" on storage.objects
  for insert
  with check (
    bucket_id = 'feedback-audio'
    and (public.is_admin() or public.is_moderator())
    and exists (
      select 1 from public.practice_logs pl
      where pl.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Ucitel maze hlasovy komentar" on storage.objects;
create policy "Ucitel maze hlasovy komentar" on storage.objects
  for delete
  using (
    bucket_id = 'feedback-audio'
    and (public.is_admin() or public.is_moderator())
    and exists (
      select 1 from public.practice_logs pl
      where pl.id::text = (storage.foldername(name))[1]
    )
  );

-- A new recording starts without any feedback, the voice comment included.
create or replace function practice_logs_start_ungraded()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if auth.uid() is not null and not (is_admin() or is_moderator()) then
    new.rating := null;
    new.teacher_comment := null;
    new.feedback_good := null;
    new.feedback_improve := null;
    new.graded_by := null;
    new.feedback_images := null;
    new.feedback_audio := null;
  end if;
  return new;
end;
$function$;
