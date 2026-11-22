-- A moderator can grade (and "mark as reviewed") every recording they see.
--
-- Since 0019 a moderator reads all recordings, so they all show in the
-- moderator's "Ke kontrole" and in the number on the menu. Updating them was
-- still only allowed to the pupil's own teacher (0039), so grading or marking
-- someone else's recording changed nothing - silently, no error - and the
-- recording stayed waiting for good.
--
-- Run this manually in the Supabase SQL editor.

drop policy if exists "Moderator upravuje nahravky" on practice_logs;
create policy "Moderator upravuje nahravky" on practice_logs
  for update
  using (is_moderator())
  with check (is_moderator());
