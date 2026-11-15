-- Admin overview of every teacher's classes (Admin -> Třídy):
--
--   * an admin reads all classes, their members and assignments
--   * admin_move_student(pupil, from, to)  - move a pupil between classes,
--     add them to one (from = null) or take them out (to = null)
--   * admin_transfer_classroom(class, teacher) - hand a class, with its
--     assignments, to another teacher (e.g. when a teacher leaves)
--   * admin_delete_classroom(class) - delete it; the app first removes the
--     assignment files from storage, which an admin may now do too
-- Every change goes to the admin history (0027).
--
-- The new policies test only is_moderator() - no subqueries into the other
-- class tables, which is what caused the policy recursion fixed in 0010.
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

drop policy if exists "Admin cte vsechny tridy" on classrooms;
create policy "Admin cte vsechny tridy" on classrooms
  for select using (is_moderator());

drop policy if exists "Admin cte cleny vsech trid" on classroom_members;
create policy "Admin cte cleny vsech trid" on classroom_members
  for select using (is_moderator());

drop policy if exists "Admin cte ukoly vsech trid" on assignments;
create policy "Admin cte ukoly vsech trid" on assignments
  for select using (is_moderator());

drop policy if exists "Admin maze prilohy ukolu" on storage.objects;
create policy "Admin maze prilohy ukolu" on storage.objects
  for delete using (bucket_id = 'assignment-files' and public.is_moderator());

create or replace function admin_move_student(p_student_id uuid, p_from uuid, p_to uuid)
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

create or replace function admin_transfer_classroom(p_classroom_id uuid, p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_name text;
  v_old_teacher uuid;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Třídy předává jen admin.';
  end if;
  select name, teacher_id into v_name, v_old_teacher from classrooms where id = p_classroom_id for update;
  if v_name is null then
    raise exception 'Třída neexistuje.';
  end if;
  if v_old_teacher = p_teacher_id then
    return;
  end if;
  if not exists (select 1 from profiles where id = p_teacher_id and role = 'teacher' and coalesce(is_verified, false)) then
    raise exception 'Třídu jde předat jen ověřenému učiteli.';
  end if;

  update classrooms set teacher_id = p_teacher_id where id = p_classroom_id;
  update assignments set teacher_id = p_teacher_id where classroom_id = p_classroom_id;

  perform log_admin_action('transfer_classroom', p_teacher_id, jsonb_build_object(
    'classroom', v_name,
    'from', (select full_name from profiles where id = v_old_teacher)
  ));
end;
$function$;

create or replace function admin_delete_classroom(p_classroom_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_name text;
  v_teacher uuid;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Cizí třídy maže jen admin.';
  end if;
  select name, teacher_id into v_name, v_teacher from classrooms where id = p_classroom_id;
  if v_name is null then
    return; -- already gone
  end if;

  -- Members, assignments and their recipients go with it (on delete
  -- cascade, 0009); recordings keep existing, just lose the assignment (0018).
  delete from classrooms where id = p_classroom_id;

  perform log_admin_action('delete_classroom', v_teacher, jsonb_build_object('classroom', v_name));
end;
$function$;

revoke execute on function admin_move_student(uuid, uuid, uuid) from public, anon;
revoke execute on function admin_transfer_classroom(uuid, uuid) from public, anon;
revoke execute on function admin_delete_classroom(uuid) from public, anon;
grant execute on function admin_move_student(uuid, uuid, uuid) to authenticated;
grant execute on function admin_transfer_classroom(uuid, uuid) to authenticated;
grant execute on function admin_delete_classroom(uuid) to authenticated;
