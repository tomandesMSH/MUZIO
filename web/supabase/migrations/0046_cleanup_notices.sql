-- Telling pupils before old sound files are cleared out, so they can save the
-- recordings they care about first. The clearing itself stays manual
-- (Admin -> Využití -> Úklid starých nahrávek, 0034).
--
--   kind 'all'     - the admin's "Oznámit čištění": every pupil, clearing in
--                    7 days (admin_announce_cleanup)
--   kind 'largest' - automatic when storage is nearly full: only the owners of
--                    the largest files, listed in cleanup_notice_logs
--                    (0047, api/notify.ts storage-check)
--
-- The pupil sees an open notice (delete_after today or later) as a banner on
-- the dashboard; the push notification goes from api/notify.ts.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

create table if not exists cleanup_notices (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('all', 'largest')),
  -- The first day the files may go.
  delete_after date not null,
  created_at timestamptz not null default now(),
  -- Null for the automatic one.
  created_by uuid references profiles(id) on delete set null
);
create index if not exists cleanup_notices_open on cleanup_notices(delete_after desc);

-- For 'largest': the recordings whose sound will be cleared.
create table if not exists cleanup_notice_logs (
  notice_id uuid not null references cleanup_notices(id) on delete cascade,
  practice_log_id bigint not null references practice_logs(id) on delete cascade,
  primary key (notice_id, practice_log_id)
);
create index if not exists cleanup_notice_logs_log on cleanup_notice_logs(practice_log_id);

alter table cleanup_notices enable row level security;
alter table cleanup_notice_logs enable row level security;

-- Written only by the functions below and the service role (api/notify.ts).
drop policy if exists "Oznameni o uklidu cte koho se tyka" on cleanup_notices;
create policy "Oznameni o uklidu cte koho se tyka" on cleanup_notices
  for select using (
    is_moderator()
    or (
      kind = 'all'
      and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'student')
    )
    or exists (
      select 1 from cleanup_notice_logs l
      join practice_logs pl on pl.id = l.practice_log_id
      where l.notice_id = cleanup_notices.id and pl.user_id = auth.uid()
    )
  );

drop policy if exists "Nahravky k uklidu cte jejich zak" on cleanup_notice_logs;
create policy "Nahravky k uklidu cte jejich zak" on cleanup_notice_logs
  for select using (
    is_moderator()
    or exists (select 1 from practice_logs pl where pl.id = practice_log_id and pl.user_id = auth.uid())
  );

-- "Oznámit čištění": a notice to every pupil, clearing from 7 days on.
-- Returns the notice id for the push notification.
create or replace function admin_announce_cleanup()
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_after date := current_date + 7;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Čištění může oznámit jen admin.';
  end if;

  insert into cleanup_notices (kind, delete_after, created_by)
  values ('all', v_after, auth.uid())
  returning id into v_id;

  perform log_admin_action('announce_cleanup', null, jsonb_build_object('delete_after', v_after));
  return v_id;
end;
$function$;

revoke execute on function admin_announce_cleanup() from public, anon;
grant execute on function admin_announce_cleanup() to authenticated;
