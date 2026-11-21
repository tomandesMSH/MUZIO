-- A recording someone reported couldn't be deleted: reported_content.practice_log_id
-- (0011) had no ON DELETE, so the foreign key blocked removing the practice_logs
-- row. The report stays (moderators keep its history), it just stops pointing
-- at the recording - the same thing 0033 does by hand when an account is deleted.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

alter table reported_content drop constraint if exists reported_content_practice_log_id_fkey;
alter table reported_content
  add constraint reported_content_practice_log_id_fkey
  foreign key (practice_log_id) references practice_logs(id) on delete set null;
