-- Učebny -> Žáci -> Pozvat: the teacher invites a particular pupil of the
-- school into a class. The pupil sees the invitation on their dashboard and
-- in Třídy and accepts or declines it. (The other way in, the class link
-- /pripojit/<kód>, uses join_classroom from 0009 and needs nothing here.)
--
--   classroom_invites          - one row per class and pupil
--   search_school_pupils(...)  - pupils by name, for the teacher's search
--   invite_to_classroom(...)   - the teacher (or an admin) invites
--   cancel_classroom_invite()  - the teacher takes it back
--   my_classroom_invites()     - the pupil's open invitations, with names
--   respond_classroom_invite() - the pupil accepts / declines
--
-- Run this manually in the Supabase SQL editor.

create table if not exists classroom_invites (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  invited_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (classroom_id, student_id)
);

alter table classroom_invites enable row level security;

-- Reading: the pupil their own, the class's teacher theirs, admins all.
-- Writing only through the functions below.
drop policy if exists "Pozvanky do tridy cte zak, ucitel a admin" on classroom_invites;
create policy "Pozvanky do tridy cte zak, ucitel a admin" on classroom_invites
  for select using (
    student_id = auth.uid()
    or is_moderator()
    or exists (select 1 from classrooms c where c.id = classroom_invites.classroom_id and c.teacher_id = auth.uid())
  );

-- The teacher's search: pupils of the whole school by name (at least two
-- letters, at most 20 hits), whether they are already in the class or invited.
create or replace function search_school_pupils(p_classroom uuid, p_query text)
returns table (id uuid, full_name text, is_member boolean, is_invited boolean)
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
      and coalesce(p.is_banned, false) = false
      and p.full_name ilike '%' || trim(p_query) || '%'
    order by p.full_name
    limit 20;
end;
$function$;

create or replace function invite_to_classroom(p_classroom uuid, p_student uuid)
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

create or replace function cancel_classroom_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  delete from classroom_invites i
  where i.id = p_invite
    and i.status = 'pending'
    and (is_moderator() or exists (select 1 from classrooms c where c.id = i.classroom_id and c.teacher_id = auth.uid()));
end;
$function$;

-- The class's open invitations with the pupils' names (the teacher may not
-- read the profile of a pupil outside their classes).
create or replace function classroom_sent_invites(p_classroom uuid)
returns table (id uuid, student_id uuid, full_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $function$
  select i.id, i.student_id, p.full_name, i.created_at
  from classroom_invites i
  join profiles p on p.id = i.student_id
  where i.classroom_id = p_classroom
    and i.status = 'pending'
    and (is_moderator() or exists (select 1 from classrooms c where c.id = p_classroom and c.teacher_id = auth.uid()))
  order by i.created_at desc
$function$;

-- The pupil can't read classrooms they aren't in, so the names come from here.
create or replace function my_classroom_invites()
returns table (id uuid, classroom_name text, teacher_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $function$
  select i.id, c.name, t.full_name, i.created_at
  from classroom_invites i
  join classrooms c on c.id = i.classroom_id
  left join profiles t on t.id = c.teacher_id
  where i.student_id = auth.uid() and i.status = 'pending'
  order by i.created_at desc
$function$;

create or replace function respond_classroom_invite(p_invite uuid, p_accept boolean)
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
  if p_accept then
    insert into classroom_members (classroom_id, student_id)
    values (v_classroom, auth.uid())
    on conflict (classroom_id, student_id) do nothing;
  end if;
  update classroom_invites set status = case when p_accept then 'accepted' else 'declined' end where id = p_invite;
  return v_classroom;
end;
$function$;

revoke execute on function search_school_pupils(uuid, text) from public, anon;
revoke execute on function invite_to_classroom(uuid, uuid) from public, anon;
revoke execute on function cancel_classroom_invite(uuid) from public, anon;
revoke execute on function classroom_sent_invites(uuid) from public, anon;
revoke execute on function my_classroom_invites() from public, anon;
revoke execute on function respond_classroom_invite(uuid, boolean) from public, anon;
grant execute on function search_school_pupils(uuid, text) to authenticated;
grant execute on function invite_to_classroom(uuid, uuid) to authenticated;
grant execute on function cancel_classroom_invite(uuid) to authenticated;
grant execute on function classroom_sent_invites(uuid) to authenticated;
grant execute on function my_classroom_invites() to authenticated;
grant execute on function respond_classroom_invite(uuid, boolean) to authenticated;
