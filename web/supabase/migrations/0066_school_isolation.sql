-- More schools in one installation, step 3 (Muzio-plan/docs/plan-vice-skol.md,
-- docs/rls-audit.md): schools don't see into each other.
--
-- The idea: a class and all its pupils are always in the class's school.
-- Every way into a class checks it (code, invite, search, direct insert),
-- so everything that hangs on "pupil of my class" (teacher_has_pupil,
-- teacher_can_view_practice_log, flames, badges, messages...) stays inside
-- the school without changing. On top of that, teachers read profiles of
-- their own school only. The admin (moderator) stays global.
--
-- With one school (today) nobody notices anything.
-- Test: web/supabase/tests/school_isolation.sql (run after this and after
-- every migration that touches permissions).

-- Profiles: a teacher reads their own school only ---------------------------

drop policy if exists "Povolit čtení profilu" on public.profiles;
create policy "Povolit čtení profilu" on public.profiles
  for select to authenticated
  using (auth.uid() = id or (is_admin() and school_id = my_school_id()));

-- Classrooms: always in the teacher's school -------------------------------

drop policy if exists "Ucitel spravuje sve ucebny" on public.classrooms;
create policy "Ucitel spravuje sve ucebny" on public.classrooms
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and school_id = my_school_id());

-- Members: only pupils of the class's school --------------------------------

create or replace function public.pupil_fits_classroom(p_classroom uuid, p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from classrooms c join profiles p on p.school_id = c.school_id
    where c.id = p_classroom and p.id = p_student
  )
$$;

drop policy if exists "Ucitel spravuje cleny svych ucemen" on public.classroom_members;
create policy "Ucitel spravuje cleny svych ucemen" on public.classroom_members
  for all
  using (is_classroom_teacher(classroom_id))
  with check (is_classroom_teacher(classroom_id) and pupil_fits_classroom(classroom_id, student_id));

-- Joining by code: a pupil without any class moves to the class's school
-- (every new account starts in the default school); anyone else from
-- another school gets an error.
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

  return v_classroom_id;
end;
$function$;

-- Invites (0062): only pupils of the class's school --------------------------

create or replace function public.invite_to_classroom(p_classroom uuid, p_student uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
begin
  if not (is_moderator() or exists (select 1 from classrooms c where c.id = p_classroom and c.teacher_id = auth.uid())) then
    raise exception 'Tahle třída není tvoje.';
  end if;
  if not exists (select 1 from profiles p where p.id = p_student and p.role = 'student') then
    raise exception 'Pozvat jde jen žáka.';
  end if;
  if not pupil_fits_classroom(p_classroom, p_student) then
    raise exception 'Žák je z jiné školy.';
  end if;
  if exists (select 1 from classroom_members m where m.classroom_id = p_classroom and m.student_id = p_student) then
    raise exception 'Žák už ve třídě je.';
  end if;
  insert into classroom_invites (classroom_id, student_id, invited_by, status, created_at)
  values (p_classroom, p_student, auth.uid(), 'pending', now())
  on conflict (classroom_id, student_id)
    do update set status = 'pending', invited_by = auth.uid(), created_at = now()
  returning id into v_id;
  return v_id;
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
  end if;
  update classroom_invites set status = case when p_accept then 'accepted' else 'declined' end where id = p_invite;
  return v_classroom;
end;
$function$;

create or replace function public.search_school_pupils(p_classroom uuid, p_query text)
returns table(id uuid, full_name text, is_member boolean, is_invited boolean)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if not (is_moderator() or exists (select 1 from classrooms c where c.id = p_classroom and c.teacher_id = auth.uid())) then
    raise exception 'Tahle třída není tvoje.';
  end if;
  if length(trim(coalesce(p_query, ''))) < 2 then
    return;
  end if;
  return query
    select p.id, p.full_name,
           exists (select 1 from classroom_members m where m.classroom_id = p_classroom and m.student_id = p.id),
           exists (select 1 from classroom_invites i where i.classroom_id = p_classroom and i.student_id = p.id and i.status = 'pending')
    from profiles p
    where p.role = 'student'
      and p.school_id = (select c.school_id from classrooms c where c.id = p_classroom)
      and coalesce(p.is_banned, false) = false
      and p.full_name ilike '%' || trim(p_query) || '%'
    order by p.full_name
    limit 20;
end;
$function$;

-- Admin moves and transfers stay within the school -----------------------

create or replace function public.admin_move_student(p_student_id uuid, p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_from_name text;
  v_to_name text;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Žáky mezi třídami přesouvá jen admin.';
  end if;
  if p_from is null and p_to is null then
    raise exception 'Vyber třídu.';
  end if;
  if p_from is not distinct from p_to then
    return;
  end if;
  if not exists (select 1 from profiles where id = p_student_id and role = 'student') then
    raise exception 'Do třídy jde jen žák.';
  end if;

  if p_from is not null then
    select name into v_from_name from classrooms where id = p_from;
    if v_from_name is null then
      raise exception 'Třída neexistuje.';
    end if;
    delete from classroom_members where classroom_id = p_from and student_id = p_student_id;
  end if;
  if p_to is not null then
    select name into v_to_name from classrooms where id = p_to;
    if v_to_name is null then
      raise exception 'Třída neexistuje.';
    end if;
    if not pupil_fits_classroom(p_to, p_student_id) then
      raise exception 'Třída je v jiné škole než žák.';
    end if;
    insert into classroom_members (classroom_id, student_id) values (p_to, p_student_id)
      on conflict do nothing;
  end if;

  if p_to is null then
    perform log_admin_action('remove_from_classroom', p_student_id, jsonb_build_object('classroom', v_from_name));
  else
    perform log_admin_action('move_student', p_student_id, jsonb_build_object('from', v_from_name, 'to', v_to_name));
  end if;
end;
$function$;

create or replace function public.admin_transfer_classroom(p_classroom_id uuid, p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_name text;
  v_old_teacher uuid;
  v_school uuid;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Třídy předává jen admin.';
  end if;
  select name, teacher_id, school_id into v_name, v_old_teacher, v_school from classrooms where id = p_classroom_id for update;
  if v_name is null then
    raise exception 'Třída neexistuje.';
  end if;
  if v_old_teacher = p_teacher_id then
    return;
  end if;
  if not exists (select 1 from profiles where id = p_teacher_id and role = 'teacher' and coalesce(is_verified, false)) then
    raise exception 'Třídu jde předat jen ověřenému učiteli.';
  end if;
  if not exists (select 1 from profiles where id = p_teacher_id and school_id = v_school) then
    raise exception 'Třídu jde předat jen učiteli stejné školy.';
  end if;

  update classrooms set teacher_id = p_teacher_id where id = p_classroom_id;
  update assignments set teacher_id = p_teacher_id where classroom_id = p_classroom_id;

  perform log_admin_action('transfer_classroom', p_teacher_id, jsonb_build_object(
    'classroom', v_name,
    'from', (select full_name from profiles where id = v_old_teacher)
  ));
end;
$function$;

-- Base44 data belong to the default school only ---------------------------

create or replace function public.base44_migration_overview()
returns table(base44_name text, flames integer, stars integer, badges integer, claimed boolean, muzio_name text, claimed_at timestamp with time zone)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null
     or not (is_moderator() or (is_admin() and my_school_id() = default_school_id())) then
    raise exception 'Přehled migrace vidí jen učitel nebo admin.';
  end if;

  return query
    select b.full_name,
           b.flames,
           b.stars,
           coalesce(array_length(b.badges, 1), 0),
           b.claimed_by is not null,
           p.full_name,
           b.claimed_at
    from base44_import b
    left join profiles p on p.id = b.claimed_by
    order by (b.claimed_by is not null), b.full_name;
end;
$function$;

-- search_path for the older SECURITY DEFINER helpers (audit) ---------------

alter function public.is_admin() set search_path = public;
alter function public.is_moderator() set search_path = public;
alter function public.is_classroom_member(uuid) set search_path = public;
alter function public.is_classroom_teacher(uuid) set search_path = public;
alter function public.assignment_has_recipients(uuid) set search_path = public;
alter function public.assignment_targets_me(uuid) set search_path = public;
alter function public.teacher_can_view_practice_log(uuid, uuid, uuid) set search_path = public;
