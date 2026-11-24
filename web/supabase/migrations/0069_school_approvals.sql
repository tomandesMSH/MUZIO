-- More schools in one installation, step 6 (Muzio-plan/docs/plan-vice-skol.md):
--  - a pupil who joins a class with the teacher's code, link or invite is
--    approved right away (the code is the teacher's say-so);
--  - the school admin approves pupils and verifies teachers of their school.
-- join_classroom and respond_classroom_invite are the 0066 versions plus
-- the approval.

create or replace function public.join_classroom(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_classroom_id uuid;
  v_school uuid;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;

  select id, school_id into v_classroom_id, v_school from classrooms where join_code = upper(trim(p_code));
  if v_classroom_id is null then
    raise exception 'Neplatný kód učebny.';
  end if;

  if (select school_id from profiles where id = auth.uid()) is distinct from v_school then
    if exists (select 1 from profiles where id = auth.uid() and role = 'student')
       and not exists (select 1 from classroom_members where student_id = auth.uid()) then
      perform set_config('muzio.trusted_admin', 'on', true);
      update profiles set school_id = v_school where id = auth.uid();
      perform set_config('muzio.trusted_admin', 'off', true);
    else
      raise exception 'Tahle třída patří jiné škole. Požádej učitele o kód třídy ze své školy.';
    end if;
  end if;

  insert into classroom_members (classroom_id, student_id)
  values (v_classroom_id, auth.uid())
  on conflict (classroom_id, student_id) do nothing;

  -- The teacher's code: no need to wait for approval.
  if exists (select 1 from profiles where id = auth.uid() and role = 'student' and not coalesce(is_approved, false)) then
    perform set_config('muzio.trusted_admin', 'on', true);
    update profiles set is_approved = true where id = auth.uid();
    perform set_config('muzio.trusted_admin', 'off', true);
  end if;

  return v_classroom_id;
end;
$function$;

create or replace function public.respond_classroom_invite(p_invite uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_classroom uuid;
begin
  select classroom_id into v_classroom
  from classroom_invites
  where id = p_invite and student_id = auth.uid() and status = 'pending';
  if v_classroom is null then
    raise exception 'Pozvánka už neplatí.';
  end if;
  if p_accept and not pupil_fits_classroom(v_classroom, auth.uid()) then
    raise exception 'Tahle třída patří jiné škole.';
  end if;
  if p_accept then
    insert into classroom_members (classroom_id, student_id)
    values (v_classroom, auth.uid())
    on conflict (classroom_id, student_id) do nothing;

    perform set_config('muzio.trusted_admin', 'on', true);
    update profiles set is_approved = true where id = auth.uid() and role = 'student' and not coalesce(is_approved, false);
    perform set_config('muzio.trusted_admin', 'off', true);
  end if;
  update classroom_invites set status = case when p_accept then 'accepted' else 'declined' end where id = p_invite;
  return v_classroom;
end;
$function$;

-- School admin: approve a pupil of their school -----------------------------

create or replace function public.school_admin_approve_pupil(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count int;
begin
  if auth.uid() is null or not is_school_admin() then
    raise exception 'Schvalovat může jen správce školy.';
  end if;
  if not exists (
    select 1 from profiles where id = p_student and role = 'student' and school_id = my_school_id()
  ) then
    raise exception 'Žák není z tvé školy.';
  end if;

  perform set_config('muzio.trusted_admin', 'on', true);
  update profiles set is_approved = true where id = p_student and not coalesce(is_approved, false);
  get diagnostics v_count = row_count;
  perform set_config('muzio.trusted_admin', 'off', true);

  if v_count > 0 then
    perform log_admin_action('approve_student', p_student);
  end if;
end;
$function$;

-- School admin: verify or unverify a teacher of their school (not themselves,
-- not a global admin) ------------------------------------------------------

create or replace function public.school_admin_set_verified(p_teacher uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count int;
begin
  if auth.uid() is null or not is_school_admin() then
    raise exception 'Učitele ověřuje jen správce školy.';
  end if;
  if p_teacher = auth.uid() then
    raise exception 'Svoje vlastní ověření měnit nemůžeš.';
  end if;
  if not exists (
    select 1 from profiles
    where id = p_teacher and role = 'teacher' and school_id = my_school_id() and not coalesce(is_moderator, false)
  ) then
    raise exception 'Učitel není z tvé školy.';
  end if;

  perform set_config('muzio.trusted_admin', 'on', true);
  update profiles set is_verified = p_on where id = p_teacher and coalesce(is_verified, false) <> p_on;
  get diagnostics v_count = row_count;
  perform set_config('muzio.trusted_admin', 'off', true);

  if v_count > 0 then
    perform log_admin_action(case when p_on then 'verify_teacher' else 'unverify_teacher' end, p_teacher);
  end if;
end;
$function$;
