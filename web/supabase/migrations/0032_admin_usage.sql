-- How much of the Supabase plan MUZIO uses (Admin -> Využití), so the admin
-- sees the free tier filling up without opening the dashboard.
--
-- admin_usage() returns one JSON object:
--   database_bytes   - pg_database_size, what the 500 MB free limit counts
--   buckets          - per storage bucket: files and bytes (the 1 GB limit)
--   top_pupils       - the 10 pupils whose recordings take the most space
--                      (recordings live in recordings/<pupil id>/...)
--   counts           - accounts and recordings
-- Only for an admin (is_moderator()).
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

create or replace function admin_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Využití vidí jen admin.';
  end if;

  return jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'buckets', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket_id, 'files', files, 'bytes', bytes) order by bytes desc)
      from (
        select bucket_id, count(*) as files, coalesce(sum((metadata->>'size')::bigint), 0) as bytes
        from storage.objects
        group by bucket_id
      ) b
    ), '[]'::jsonb),
    'top_pupils', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', p.full_name, 'files', t.files, 'bytes', t.bytes) order by t.bytes desc)
      from (
        select (storage.foldername(name))[1] as id, count(*) as files,
               coalesce(sum((metadata->>'size')::bigint), 0) as bytes
        from storage.objects
        where bucket_id = 'recordings'
        group by 1
        order by 3 desc
        limit 10
      ) t
      left join profiles p on p.id::text = t.id
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'students', (select count(*) from profiles where role = 'student'),
      'teachers', (select count(*) from profiles where role = 'teacher'),
      'recordings', (select count(*) from practice_logs)
    )
  );
end;
$function$;

revoke execute on function admin_usage() from public, anon;
grant execute on function admin_usage() to authenticated;
