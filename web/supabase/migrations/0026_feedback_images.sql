-- Pictures in the teacher's feedback (issue #4): with a grade the teacher can
-- attach up to 3 images - a photo of the score with the tricky bar circled,
-- a fingering sketch.
--
-- The app shrinks every image to a JPEG of at most 1600 px before upload, so
-- files are small; the bucket still caps them at 5 MB and accepts only
-- JPEG / PNG / WebP.
--
-- Files live in the private bucket "feedback-images" at
-- <practice log id>/<random name>.jpg, and the paths are kept in
-- practice_logs.feedback_images (in the order the teacher added them).
--
-- Access follows the recording, through the caller's own RLS on practice_logs
-- (0014, 0019): whoever can see the recording - the pupil, a teacher who may
-- grade it, a moderator - can view its pictures. Only a verified teacher who
-- can see the recording, or a moderator, can add or remove them. The app
-- shows them through short-lived signed URLs.
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

alter table practice_logs add column if not exists feedback_images text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_logs_feedback_images_max3') then
    alter table practice_logs
      add constraint practice_logs_feedback_images_max3
      check (feedback_images is null or cardinality(feedback_images) <= 3);
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-images', 'feedback-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Obrazek k hodnoceni vidi, kdo vidi nahravku" on storage.objects;
create policy "Obrazek k hodnoceni vidi, kdo vidi nahravku" on storage.objects
  for select
  using (
    bucket_id = 'feedback-images'
    and exists (
      select 1 from public.practice_logs pl
      where pl.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Ucitel nahrava obrazky k hodnoceni" on storage.objects;
create policy "Ucitel nahrava obrazky k hodnoceni" on storage.objects
  for insert
  with check (
    bucket_id = 'feedback-images'
    and (public.is_admin() or public.is_moderator())
    and exists (
      select 1 from public.practice_logs pl
      where pl.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Ucitel maze obrazky k hodnoceni" on storage.objects;
create policy "Ucitel maze obrazky k hodnoceni" on storage.objects
  for delete
  using (
    bucket_id = 'feedback-images'
    and (public.is_admin() or public.is_moderator())
    and exists (
      select 1 from public.practice_logs pl
      where pl.id::text = (storage.foldername(name))[1]
    )
  );

-- A new recording starts without pictures too (0024 already clears the grade
-- when a pupil inserts one).
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
  end if;
  return new;
end;
$function$;
