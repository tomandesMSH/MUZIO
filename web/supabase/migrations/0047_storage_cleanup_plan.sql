-- Automatic warning when the file storage is nearly full (needs 0046).
--
-- Once a day api/notify.ts (the hourly muzio-reminders cron, 0035) calls
-- auto_cleanup_notice with the plan's storage limit. Above 85 % it picks the
-- largest sound files of graded recordings - as many as it takes to get back
-- to 40 % - and records them in a 'largest' notice with clearing from
-- tomorrow. Their owners get a notification and the dashboard banner. The
-- admin then clears exactly those files by hand (Úklid starých nahrávek ->
-- Z oznámení), using admin_notice_cleanup_candidates below.
--
-- No new notice while an earlier 'largest' one still has files with sound:
-- the pupils are warned once, not every day.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

-- Path of a recording's file inside the 'recordings' bucket (as in 0034).
create or replace function recording_storage_path(p_audio_url text)
returns text
language sql
immutable
as $function$
  select case
    when p_audio_url is null or position('/recordings/' in p_audio_url) = 0 then null
    else substring(p_audio_url from position('/recordings/' in p_audio_url) + length('/recordings/'))
  end
$function$;

-- Only for the service role (api/notify.ts). Returns the new notice's id and
-- the owners to notify, or nothing when no notice is needed.
create or replace function auto_cleanup_notice(
  p_limit_bytes bigint,
  p_warn_share numeric default 0.85,
  p_target_share numeric default 0.40
)
returns table (notice_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_total bigint;
  v_notice uuid;
begin
  select coalesce(sum((o.metadata->>'size')::bigint), 0) into v_total from storage.objects o;
  if v_total <= p_limit_bytes * p_warn_share then
    return;
  end if;

  -- An earlier warning whose files haven't been cleared yet.
  if exists (
    select 1 from cleanup_notices n
    join cleanup_notice_logs l on l.notice_id = n.id
    join practice_logs pl on pl.id = l.practice_log_id
    where n.kind = 'largest' and pl.audio_url is not null
  ) then
    return;
  end if;

  insert into cleanup_notices (kind, delete_after) values ('largest', current_date + 1)
  returning id into v_notice;

  -- Largest first; a file is taken while the storage is still above the
  -- target before it (so the last one taken gets it to the target or below).
  insert into cleanup_notice_logs (notice_id, practice_log_id)
  select v_notice, f.id
  from (
    select pl.id,
           coalesce(sum(o.size) over (order by o.size desc, pl.id rows between unbounded preceding and 1 preceding), 0) as freed_before
    from practice_logs pl
    join lateral (
      select (so.metadata->>'size')::bigint as size
      from storage.objects so
      where so.bucket_id = 'recordings' and so.name = recording_storage_path(pl.audio_url)
    ) o on true
    where pl.rating is not null and pl.audio_url is not null and o.size > 0
  ) f
  where v_total - f.freed_before > p_limit_bytes * p_target_share;

  if not exists (select 1 from cleanup_notice_logs where cleanup_notice_logs.notice_id = v_notice) then
    delete from cleanup_notices where id = v_notice;
    return;
  end if;

  return query
    select distinct v_notice, pl.user_id
    from cleanup_notice_logs l
    join practice_logs pl on pl.id = l.practice_log_id
    where l.notice_id = v_notice;
end;
$function$;

revoke execute on function auto_cleanup_notice(bigint, numeric, numeric) from public, anon, authenticated;

-- The files of a 'largest' notice that still have sound, for the admin's
-- clean-up (same shape as admin_cleanup_candidates, 0034).
create or replace function admin_notice_cleanup_candidates(p_notice uuid)
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
           recording_storage_path(pl.audio_url) as path,
           coalesce((
             select (o.metadata->>'size')::bigint from storage.objects o
             where o.bucket_id = 'recordings' and o.name = recording_storage_path(pl.audio_url)
           ), 0) as bytes
    from cleanup_notice_logs l
    join practice_logs pl on pl.id = l.practice_log_id
    where l.notice_id = p_notice
      and pl.rating is not null
      and pl.audio_url is not null
      and recording_storage_path(pl.audio_url) is not null
    order by 3 desc; -- the size (a bare "bytes" would clash with the output column)
end;
$function$;

revoke execute on function admin_notice_cleanup_candidates(uuid) from public, anon;
grant execute on function admin_notice_cleanup_candidates(uuid) to authenticated;
