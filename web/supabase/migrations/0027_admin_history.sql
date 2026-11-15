-- History of admin actions: who did what to which account, and when.
--
-- Rows are written only by the database - by triggers and by the admin
-- functions (this and later migrations call log_admin_action) - never by the
-- app directly, so the history can't be forged or tidied up from the browser.
-- Only admins (is_moderator()) can read it.
--
-- Names are copied into the row, so the history still reads well after an
-- account is renamed or deleted.
--
-- Logged here:
--   verify_teacher / unverify_teacher, approve_student, ban / unban
--     - changes of those flags made by a signed-in user (trigger on profiles)
--   reset_password  - admin_reset_password (re-created below with logging)
--   delete_recording - a moderator deleting someone else's recording
-- Later migrations add role changes, account edits, deletions, ...
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

create table if not exists admin_actions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references profiles(id) on delete set null,
  actor_name text,
  action text not null,
  target_user_id uuid references profiles(id) on delete set null,
  target_name text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists admin_actions_created_idx on admin_actions (created_at desc);

alter table admin_actions enable row level security;

drop policy if exists "Admin cte historii" on admin_actions;
create policy "Admin cte historii" on admin_actions
  for select using (is_moderator());

-- No insert / update / delete policy: only the functions below write.
grant select on admin_actions to authenticated;

create or replace function log_admin_action(p_action text, p_target uuid, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into admin_actions (actor_id, actor_name, action, target_user_id, target_name, details)
  values (
    auth.uid(),
    (select full_name from profiles where id = auth.uid()),
    p_action,
    p_target,
    (select full_name from profiles where id = p_target),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$function$;

-- Internal only: called from the functions and triggers in the database.
revoke execute on function log_admin_action(text, uuid, jsonb) from public, anon, authenticated;

-- Approving, verifying and banning happen as plain updates from the app
-- (UsersSection), so they are logged by a trigger.
create or replace function profiles_log_admin_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    return null; -- SQL editor, migrations
  end if;
  if new.is_verified is distinct from old.is_verified then
    perform log_admin_action(case when new.is_verified then 'verify_teacher' else 'unverify_teacher' end, new.id);
  end if;
  if new.is_approved is distinct from old.is_approved and new.is_approved then
    perform log_admin_action('approve_student', new.id);
  end if;
  if new.is_banned is distinct from old.is_banned then
    perform log_admin_action(case when new.is_banned then 'ban' else 'unban' end, new.id);
  end if;
  return null;
end;
$function$;

drop trigger if exists profiles_log_admin_changes on profiles;
create trigger profiles_log_admin_changes
  after update of is_verified, is_approved, is_banned on profiles
  for each row
  execute function profiles_log_admin_changes();

-- A moderator deleting someone else's recording (a teacher tidying up their
-- own pupils' recordings is everyday work, not logged).
create or replace function practice_logs_log_moderator_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is not null and is_moderator() and old.user_id <> auth.uid() then
    perform log_admin_action('delete_recording', old.user_id,
      jsonb_build_object('recorded_at', old.created_at, 'rating', old.rating));
  end if;
  return null;
end;
$function$;

drop trigger if exists practice_logs_log_moderator_delete on practice_logs;
create trigger practice_logs_log_moderator_delete
  after delete on practice_logs
  for each row
  execute function practice_logs_log_moderator_delete();

-- admin_reset_password from 0020, unchanged except for the log line.
create or replace function admin_reset_password(p_user_id uuid, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_target_role text;
  v_target_is_moderator boolean;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;

  -- Same minimum length Supabase Auth enforces on signUp by default.
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'Heslo musí mít alespoň 6 znaků.';
  end if;

  select role::text, (role = 'moderator' or coalesce(is_moderator, false))
    into v_target_role, v_target_is_moderator
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'Uživatel neexistuje.';
  end if;

  if v_target_is_moderator then
    raise exception 'Heslo moderátora nelze tímto způsobem změnit.';
  end if;

  if not (is_moderator() or (is_admin() and v_target_role = 'student')) then
    raise exception 'K obnovení tohoto hesla nemáš oprávnění.';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  -- Sign the user out everywhere. auth.sessions cascades to refresh tokens.
  delete from auth.sessions where user_id = p_user_id;

  perform log_admin_action('reset_password', p_user_id);
end;
$function$;

revoke all on function admin_reset_password(uuid, text) from public, anon;
grant execute on function admin_reset_password(uuid, text) to authenticated;
