-- "Oznámení" -> "Označit jako přečtené": the number on the teacher's
-- Dashboard counts only recordings that came in after this moment. The
-- recordings stay in "Ke kontrole" to be graded; only the number goes away.
-- Kept with the notification settings (0035), which the user already owns
-- (RLS: own row only), so it's the same on the phone and the computer.
--
-- Run this manually in the Supabase SQL editor.

alter table notification_settings add column if not exists review_badge_seen_at timestamptz;
