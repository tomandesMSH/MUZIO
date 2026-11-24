-- More schools in one installation, step 4 (Muzio-plan/docs/plan-vice-skol.md):
-- the admin founds a school and invites its admin and teachers with a link
-- (/skola/<kód>). The invited teacher joins that school, verified (the link
-- is the verification); a school admin invite also makes them its admin.

-- Founding a school (admin) ---------------------------------------------

create or replace function public.admin_create_school(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Školy zakládá jen admin.';
  end if;
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Název školy musí mít 2 až 120 znaků.';
  end if;
  if exists (select 1 from schools where lower(name) = lower(v_name)) then
    raise exception 'Škola „%“ už existuje.', v_name;
  end if;

  insert into schools (name, slug)
  values (v_name, 'skola-' || substr(md5(gen_random_uuid()::text), 1, 10))
  returning id into v_id;

  perform log_admin_action('create_school', null, jsonb_build_object('school', v_name));
  return v_id;
end;
$function$;

-- Every school with its numbers (admin) ------------------------------------

create or replace function public.admin_schools()
returns table(
  id uuid,
  name text,
  is_active boolean,
  created_at timestamptz,
  is_default boolean,
  teachers integer,
  pupils integer,
  classrooms integer,
  admins text[]
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Přehled škol vidí jen admin.';
  end if;

  return query
    select s.id, s.name, s.is_active, s.created_at,
           s.slug = 'vychozi',
           (select count(*)::int from profiles p where p.school_id = s.id and p.role = 'teacher'),
           (select count(*)::int from profiles p where p.school_id = s.id and p.role = 'student'),
           (select count(*)::int from classrooms c where c.school_id = s.id),
           coalesce((select array_agg(p.full_name order by p.full_name) from profiles p
                     where p.school_id = s.id and p.is_school_admin), '{}')
    from schools s
    order by s.slug <> 'vychozi', s.name;
end;
$function$;

-- Invite links ----------------------------------------------------------

-- The admin for any school; a school admin teachers for their own school.
create or replace function public.create_school_invite(p_school uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;
  if p_role not in ('school_admin', 'teacher') then
    raise exception 'Neznámá role.';
  end if;
  if not exists (select 1 from schools where id = p_school and is_active) then
    raise exception 'Škola neexistuje.';
  end if;
  if not (
    is_moderator()
    or (p_role = 'teacher' and is_school_admin() and my_school_id() = p_school)
  ) then
    raise exception 'Pozvánku do téhle školy vytvořit nemůžeš.';
  end if;

  -- Letters and digits that can't be confused (no 0/O, 1/I/L).
  loop
    v_code := (
      select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
      from generate_series(1, 10)
    );
    exit when not exists (select 1 from school_invites where code = v_code);
  end loop;

  insert into school_invites (school_id, role, code, expires_at, created_by)
  values (p_school, p_role, v_code, now() + interval '14 days', auth.uid());
  return v_code;
end;
$function$;

-- The open invites of a school (admin, or that school's admin).
drop policy if exists "Pozvanky cte spravce skoly" on public.school_invites;
create policy "Pozvanky cte spravce skoly" on public.school_invites
  for select
  using (is_school_admin() and school_id = my_school_id());
drop policy if exists "Pozvanky rusi spravce skoly" on public.school_invites;
create policy "Pozvanky rusi spravce skoly" on public.school_invites
  for delete
  using (is_school_admin() and school_id = my_school_id() and role = 'teacher' and used_by is null);

-- What a link is about, for the page before signing in (also anonymous).
create or replace function public.school_invite_info(p_code text)
returns table(school_name text, role text, valid boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.name,
         i.role,
         i.used_by is null and (i.expires_at is null or i.expires_at > now()) and s.is_active
  from school_invites i
  join schools s on s.id = i.school_id
  where i.code = upper(btrim(p_code))
$$;
grant execute on function public.school_invite_info(text) to anon, authenticated;

-- Taking the link: a teacher account joins the school, verified.
create or replace function public.redeem_school_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_invite school_invites%rowtype;
  v_role text;
  v_school uuid;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;

  select * into v_invite from school_invites where code = upper(btrim(p_code)) for update;
  if v_invite.id is null
     or v_invite.used_by is not null
     or (v_invite.expires_at is not null and v_invite.expires_at <= now())
     or not exists (select 1 from schools where id = v_invite.school_id and is_active) then
    raise exception 'Pozvánka neplatí. Požádej o nový odkaz.';
  end if;

  select role::text, school_id into v_role, v_school from profiles where id = auth.uid() for update;
  if v_role is distinct from 'teacher' then
    raise exception 'Pozvánka do školy je pro učitelský účet.';
  end if;
  if v_school is distinct from v_invite.school_id
     and exists (select 1 from classrooms where teacher_id = auth.uid()) then
    raise exception 'Máš třídy v jiné škole. Nejdřív je předej nebo smaž.';
  end if;

  perform set_config('muzio.trusted_admin', 'on', true);
  update profiles set
    school_id = v_invite.school_id,
    is_verified = true,
    is_school_admin = (v_invite.role = 'school_admin')
      or (v_school = v_invite.school_id and is_school_admin)
  where id = auth.uid();
  perform set_config('muzio.trusted_admin', 'off', true);

  update school_invites set used_by = auth.uid(), used_at = now() where id = v_invite.id;

  perform log_admin_action('join_school', auth.uid(), jsonb_build_object(
    'school', (select name from schools where id = v_invite.school_id),
    'role', v_invite.role
  ));
  return v_invite.school_id;
end;
$function$;
