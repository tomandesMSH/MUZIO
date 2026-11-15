-- Deleting an account completely: its data, its rows in every table that
-- points at it, and the sign-in account in auth.users.
--
-- Until now a teacher's "Smazat" removed recordings and the profile only: the
-- sign-in account stayed behind, feedback pictures stayed in storage, and
-- the profile delete could fail outright - streak_events, classroom_members
-- and other tables reference profiles without ON DELETE (0007-0015).
--
-- admin_delete_account(user) - who may delete whom:
--   * an admin (is_moderator()): any account except their own and accounts
--     with admin rights (take the rights away first, 0028)
--   * a verified teacher (is_admin()): a pupil in one of their classes
-- A teacher who still has classes can't be deleted - delete or hand them
-- over first (Admin -> Třídy, 0031). The deletion goes to the admin
-- history (0027), which keeps the name.
--
-- Storage files (recordings, feedback pictures) can't be removed from SQL;
-- the app removes them first (deleteAccount in web/src/lib/data/adminUsers.ts).
--
-- Also: a badge awarded by a teacher (0025) used to vanish when that
-- teacher's account was deleted (on delete cascade on awarded_by) - the pupil
-- keeps it now.
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

alter table awarded_badges alter column awarded_by drop not null;
alter table awarded_badges drop constraint if exists awarded_badges_awarded_by_fkey;
alter table awarded_badges
  add constraint awarded_badges_awarded_by_fkey foreign key (awarded_by) references profiles(id) on delete set null;

-- 0027's trigger, quiet while an account is being deleted (one entry for
-- the deletion, not one per recording).
create or replace function practice_logs_log_moderator_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if coalesce(current_setting('muzio.trusted_admin', true), 'off') = 'on' then
    return null;
  end if;
  if auth.uid() is not null and is_moderator() and old.user_id <> auth.uid() then
    perform log_admin_action('delete_recording', old.user_id,
      jsonb_build_object('recorded_at', old.created_at, 'rating', old.rating));
  end if;
  return null;
end;
$function$;

create or replace function admin_delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text;
  v_is_admin boolean;
  v_username text;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Svůj vlastní účet smazat nemůžeš.';
  end if;

  select role::text, (role = 'moderator' or coalesce(is_moderator, false)), username
    into v_role, v_is_admin, v_username
    from profiles where id = p_user_id for update;
  if v_role is null then
    raise exception 'Uživatel neexistuje.';
  end if;
  if v_is_admin then
    raise exception 'Účet s právy admina nejde smazat. Nejdřív mu práva odeber.';
  end if;

  if not (
    is_moderator()
    or (
      is_admin() and v_role = 'student'
      and exists (
        select 1 from classroom_members cm
        join classrooms c on c.id = cm.classroom_id
        where c.teacher_id = auth.uid() and cm.student_id = p_user_id
      )
    )
  ) then
    raise exception 'Tento účet smazat nemůžeš.';
  end if;

  if exists (select 1 from classrooms where teacher_id = p_user_id) then
    raise exception 'Učitel má ještě třídy. Nejdřív je smaž nebo předej jinému učiteli.';
  end if;

  -- Logged first, while the name can still be looked up.
  perform log_admin_action('delete_account', p_user_id, jsonb_build_object('username', v_username, 'role', v_role));

  perform set_config('muzio.trusted_admin', 'on', true);

  -- Others' rows that merely mention this account keep existing.
  update practice_logs set graded_by = null where graded_by = p_user_id;
  update reported_content set reported_user_id = null where reported_user_id = p_user_id;
  update reported_content set resolved_by = null where resolved_by = p_user_id;
  update reported_content set practice_log_id = null
    where practice_log_id in (select id from practice_logs where user_id = p_user_id);
  update invite_codes set redeemed_by = null where redeemed_by = p_user_id;

  -- Rows that belong to this account go.
  delete from reported_content where reporter_id = p_user_id;
  delete from practice_logs where user_id = p_user_id; -- badges on them go too (0025)
  delete from streak_events where student_id = p_user_id;
  delete from classroom_members where student_id = p_user_id;
  delete from assignment_recipients where student_id = p_user_id;
  delete from assignments where teacher_id = p_user_id; -- none left in classes; stray ones
  delete from invite_codes where teacher_id = p_user_id;
  delete from teacher_student_links where teacher_id = p_user_id or student_id = p_user_id;

  delete from profiles where id = p_user_id;
  delete from auth.users where id = p_user_id; -- sessions and identities go with it

  perform set_config('muzio.trusted_admin', 'off', true);
end;
$function$;

revoke execute on function admin_delete_account(uuid) from public, anon;
grant execute on function admin_delete_account(uuid) to authenticated;
