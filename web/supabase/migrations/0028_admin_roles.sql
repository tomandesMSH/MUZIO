-- Admins change roles and admin rights in the app instead of the Supabase
-- dashboard.
--
--   admin_set_role(user, 'student' | 'teacher')
--   admin_set_moderator(user, true | false)   - the "Učitel + Admin" flag
--
-- Rules:
--   * only an admin (is_moderator()) may, and never on their own account -
--     so nobody locks themselves out and there is always an admin left
--   * accounts with role 'moderator' (dedicated admin accounts) are not
--     changed from the app
--   * admin rights only for a verified teacher
--   * a teacher who still has classes can't become a pupil - delete or hand
--     over the classes first
--   * a pupil who becomes a teacher leaves their classes and is verified
--     (the admin is vouching for them); a teacher who becomes a pupil is
--     approved, so they can sign in straight away
-- Every change goes to the admin history (0027).
--
-- protect_profile_privileges (0021, 0024) blocks role changes from the app;
-- these functions mark their transaction with muzio.trusted_admin, which
-- the trigger now lets through.
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

-- 0024's trigger, plus: role / admin flag may change inside admin_set_role
-- and admin_set_moderator.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  -- No user session: service role, SQL editor, migrations, signup trigger.
  if auth.uid() is null then
    return new;
  end if;

  if (new.role is distinct from old.role
      or new.is_moderator is distinct from old.is_moderator)
     and coalesce(current_setting('muzio.trusted_admin', true), 'off') <> 'on' then
    raise exception 'Roli a příznak admina nelze měnit z aplikace.';
  end if;

  if (new.stars is distinct from old.stars
      or new.streak is distinct from old.streak
      or new.xp is distinct from old.xp
      or new.streak_freezes_available is distinct from old.streak_freezes_available
      or new.streak_freeze_month is distinct from old.streak_freeze_month
      or new.last_practice_date is distinct from old.last_practice_date)
     and coalesce(current_setting('muzio.trusted_counters', true), 'off') <> 'on' then
    raise exception 'Hvězdy, XP a sérii nelze měnit přímo z aplikace.';
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.is_banned is distinct from old.is_banned
     or new.is_approved is distinct from old.is_approved then
    if coalesce(current_setting('muzio.trusted_admin', true), 'off') = 'on' then
      return new;
    end if;
    -- A moderator manages every account that is not itself an admin.
    if is_moderator() and old.role <> 'moderator' and not coalesce(old.is_moderator, false) then
      return new;
    end if;
    -- A verified teacher may only approve students.
    if is_admin()
       and old.role = 'student'
       and new.is_verified is not distinct from old.is_verified
       and new.is_banned is not distinct from old.is_banned then
      return new;
    end if;
    raise exception 'Tuto změnu účtu nemáš oprávnění provést.';
  end if;

  return new;
end;
$function$;

-- 0027's history trigger, minus the flag changes the admin functions make
-- themselves (they log one clear entry, e.g. "role: pupil -> teacher", not an
-- extra "verified teacher").
create or replace function profiles_log_admin_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or coalesce(current_setting('muzio.trusted_admin', true), 'off') = 'on' then
    return null;
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

create or replace function admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Role může měnit jen admin.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Svoji vlastní roli změnit nemůžeš.';
  end if;
  if p_role not in ('student', 'teacher') then
    raise exception 'Neznámá role.';
  end if;

  select role::text into v_role from profiles where id = p_user_id for update;
  if v_role is null then
    raise exception 'Uživatel neexistuje.';
  end if;
  if v_role = 'moderator' then
    raise exception 'Účet admina se z aplikace nemění.';
  end if;
  if v_role = p_role then
    return;
  end if;

  if p_role = 'student' and exists (select 1 from classrooms where teacher_id = p_user_id) then
    raise exception 'Učitel má ještě třídy. Nejdřív je smaž nebo předej jinému učiteli.';
  end if;

  perform set_config('muzio.trusted_admin', 'on', true);
  if p_role = 'teacher' then
    delete from classroom_members where student_id = p_user_id;
    update profiles set role = 'teacher', is_verified = true where id = p_user_id;
  else
    -- A pupil can't hold admin rights.
    update profiles set role = 'student', is_approved = true, is_moderator = false where id = p_user_id;
  end if;
  perform set_config('muzio.trusted_admin', 'off', true);

  perform log_admin_action('set_role', p_user_id, jsonb_build_object('from', v_role, 'to', p_role));
end;
$function$;

create or replace function admin_set_moderator(p_user_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text;
  v_verified boolean;
  v_flag boolean;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Práva admina může měnit jen admin.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Svoje vlastní práva admina změnit nemůžeš.';
  end if;

  select role::text, coalesce(is_verified, false), coalesce(is_moderator, false)
    into v_role, v_verified, v_flag
    from profiles where id = p_user_id for update;
  if v_role is null then
    raise exception 'Uživatel neexistuje.';
  end if;
  if v_role = 'moderator' then
    raise exception 'Účet admina se z aplikace nemění.';
  end if;
  if v_flag = p_on then
    return;
  end if;
  if p_on and not (v_role = 'teacher' and v_verified) then
    raise exception 'Práva admina jde dát jen ověřenému učiteli.';
  end if;
  -- Belt and braces: the caller is an admin and can't change themselves, so
  -- one always remains - but never let the count drop to zero.
  if not p_on and (
    select count(*) from profiles
    where (role = 'moderator' or coalesce(is_moderator, false)) and id <> p_user_id
  ) = 0 then
    raise exception 'Musí zůstat aspoň jeden admin.';
  end if;

  perform set_config('muzio.trusted_admin', 'on', true);
  update profiles set is_moderator = p_on where id = p_user_id;
  perform set_config('muzio.trusted_admin', 'off', true);

  perform log_admin_action(case when p_on then 'grant_admin' else 'revoke_admin' end, p_user_id);
end;
$function$;

revoke execute on function admin_set_role(uuid, text) from public, anon;
revoke execute on function admin_set_moderator(uuid, boolean) from public, anon;
grant execute on function admin_set_role(uuid, text) to authenticated;
grant execute on function admin_set_moderator(uuid, boolean) to authenticated;
