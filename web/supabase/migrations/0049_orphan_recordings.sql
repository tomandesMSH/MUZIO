-- Lost recordings: sound files in the 'recordings' bucket that no recording
-- row points to any more. Mostly left behind by the old clean_old_recordings
-- trigger (dropped in 0048), which deleted the rows of all but a pupil's
-- newest 7 recordings and kept the files. Also a send that uploaded the sound
-- but failed to save the row - the pupil may still resend that one from
-- their phone, so the admin picks what to restore.
--
--   admin_orphan_recordings()          - the files, their pupil, date, size
--   admin_restore_orphan_recordings()  - a new ungraded recording for each
--                                        chosen file ("Obnovená nahrávka")
-- Only for an admin (is_moderator()); restoring goes to the history (0027).
-- Needs recording_storage_path from 0047.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

create or replace function admin_orphan_recordings()
returns table (name text, user_id uuid, pupil_name text, created_at timestamptz, bytes bigint)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Ztracené nahrávky může hledat jen admin.';
  end if;

  return query
    select o.name,
           p.id,
           p.full_name,
           o.created_at,
           coalesce((o.metadata->>'size')::bigint, 0)
    from storage.objects o
    join profiles p on p.id::text = (storage.foldername(o.name))[1]
    where o.bucket_id = 'recordings'
      and not exists (
        select 1 from practice_logs pl where recording_storage_path(pl.audio_url) = o.name
      )
    order by o.created_at desc;
end;
$function$;

revoke execute on function admin_orphan_recordings() from public, anon;
grant execute on function admin_orphan_recordings() to authenticated;

-- p_names[i] is a file from admin_orphan_recordings, p_urls[i] its public URL
-- (the app builds it; checked to point at that very file).
create or replace function admin_restore_orphan_recordings(p_names text[], p_urls text[])
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count int := 0;
  i int;
  v_owner uuid;
  v_created timestamptz;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Ztracené nahrávky může obnovit jen admin.';
  end if;
  if coalesce(array_length(p_names, 1), 0) <> coalesce(array_length(p_urls, 1), 0) then
    raise exception 'Seznam souborů a adres nesedí.';
  end if;

  for i in 1 .. coalesce(array_length(p_names, 1), 0) loop
    continue when recording_storage_path(p_urls[i]) is distinct from p_names[i];
    -- Still lost (not restored meanwhile, not resent by the pupil).
    continue when exists (
      select 1 from practice_logs pl where recording_storage_path(pl.audio_url) = p_names[i]
    );

    select p.id, o.created_at into v_owner, v_created
    from storage.objects o
    join profiles p on p.id::text = (storage.foldername(o.name))[1]
    where o.bucket_id = 'recordings' and o.name = p_names[i];
    continue when v_owner is null;

    insert into practice_logs (user_id, audio_url, created_at, student_note)
    values (v_owner, p_urls[i], v_created, 'Obnovená nahrávka');
    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    perform log_admin_action('restore_recordings', null, jsonb_build_object('count', v_count));
  end if;
  return v_count;
end;
$function$;

revoke execute on function admin_restore_orphan_recordings(text[], text[]) from public, anon;
grant execute on function admin_restore_orphan_recordings(text[], text[]) to authenticated;
