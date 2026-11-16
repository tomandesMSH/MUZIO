-- Teachers can get one notification a day ("7 nových nahrávek od 5 žáků")
-- instead of one per recording. Sent by the hourly reminder run (0035) at the
-- teacher's hour (reminder_hour). Run in the Supabase SQL editor; safe twice.
alter table notification_settings add column if not exists recordings_digest boolean not null default false;
