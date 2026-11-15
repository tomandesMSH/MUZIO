-- Clearing out old recordings to keep storage within the plan
-- (Admin -> Využití -> Úklid starých nahrávek).
--
-- Only the sound file goes. The recording's row stays - with its date,
-- grade, written feedback, pictures and badges - so XP (summed from the rows,
-- 0024), levels and history don't change. The row gets audio_url = null and
-- audio_removed_at, and the app shows "Zvuk byl archivován" instead of the
-- player.
--
-- Only graded recordings older than the chosen date are offered: an
-- ungraded one still waits for the teacher.
--
--   admin_cleanup_candidates(before)  - which recordings, their storage paths
--                                       and sizes (to show and then delete)
--   admin_mark_audio_removed(ids, before) - after the app removed the files
-- Only for an admin (is_moderator()); the clean-up goes to the history (0027).
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

alter table practice_logs alter column audio_url drop not null;
alter table practice_logs add column if not exists audio_removed_at timestamptz;

create or replace function admin_cleanup_candidates(p_before date)
returns table (id bigint, path text, bytes bigint)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Úklid nahrávek může dělat jen admin.';
  end if;

  return query
    select pl.id,
           substring(pl.audio_url from position('/recordings/' in pl.audio_url) + length('/recordings/')) as path,
           coalesce((
             select (o.metadata->>'size')::bigint from storage.objects o
             where o.bucket_id = 'recordings'
               and o.name = substring(pl.audio_url from position('/recordings/' in pl.audio_url) + length('/recordings/'))
           ), 0) as bytes
    from practice_logs pl
    where pl.rating is not null
      and pl.audio_url is not null
      and position('/recordings/' in pl.audio_url) > 0
      and pl.created_at < p_before
    order by pl.created_at;
end;
$function$;

create or replace function admin_mark_audio_removed(p_ids bigint[], p_before date)
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count int;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Úklid nahrávek může dělat jen admin.';
  end if;

  update practice_logs
    set audio_url = null, audio_removed_at = now()
    where id = any(p_ids) and rating is not null and audio_url is not null and created_at < p_before;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform log_admin_action('cleanup_recordings', null, jsonb_build_object('count', v_count, 'before', p_before));
  end if;
  return v_count;
end;
$function$;

revoke execute on function admin_cleanup_candidates(date) from public, anon;
revoke execute on function admin_mark_audio_removed(bigint[], date) from public, anon;
grant execute on function admin_cleanup_candidates(date) to authenticated;
grant execute on function admin_mark_audio_removed(bigint[], date) to authenticated;
