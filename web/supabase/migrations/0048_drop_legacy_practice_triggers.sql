-- Two old triggers on practice_logs that were set up outside these migrations
-- (in the Supabase dashboard) and must go:
--
--   on_practice_log_inserted -> update_user_streak()
--     Its own streak counting, on every recording (not once a day) and
--     without the streak freeze. The streak belongs to record_practice_session
--     (0015, 0024). Since 0024 it also writes profiles.streak without the
--     muzio.trusted_counters flag, so protect_profile_privileges stops the
--     whole insert: "Hvězdy, XP a sérii nelze měnit přímo z aplikace." and the
--     pupil's recording doesn't arrive.
--
--   trigger_clean_old_recordings -> clean_old_recordings()
--     Deleted every recording of the pupil except the newest 7 on each new
--     one - rows with grades, comments, badges and XP, while the sound files
--     stayed in storage. Old sound is cleared by hand instead (0034, 0046,
--     0047), the rows stay.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

drop trigger if exists on_practice_log_inserted on practice_logs;
drop function if exists update_user_streak();

drop trigger if exists trigger_clean_old_recordings on practice_logs;
drop function if exists clean_old_recordings();
