-- More schools in one installation, step 5 (Muzio-plan/docs/plan-vice-skol.md):
-- the school admin's panel. One call gives everything it shows about their
-- own school: teachers, pupils and classes (a teacher can't read other
-- teachers' classes through RLS, so it's a SECURITY DEFINER function that
-- checks the caller is the admin of that school).

create or replace function public.school_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_school uuid := my_school_id();
begin
  if auth.uid() is null or not is_school_admin() then
    raise exception 'Přehled školy vidí jen její správce.';
  end if;

  return jsonb_build_object(
    'school', (select jsonb_build_object('id', s.id, 'name', s.name) from schools s where s.id = v_school),
    'teachers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'is_verified', coalesce(p.is_verified, false),
        'is_school_admin', p.is_school_admin,
        'classrooms', (select count(*) from classrooms c where c.teacher_id = p.id)
      ) order by p.full_name)
      from profiles p
      where p.school_id = v_school and p.role = 'teacher'
    ), '[]'::jsonb),
    'pupils', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'is_approved', coalesce(p.is_approved, false),
        'is_banned', coalesce(p.is_banned, false),
        'created_at', p.created_at,
        'classrooms', coalesce((
          select jsonb_agg(c.name order by c.name)
          from classroom_members cm join classrooms c on c.id = cm.classroom_id
          where cm.student_id = p.id
        ), '[]'::jsonb)
      ) order by p.full_name)
      from profiles p
      where p.school_id = v_school and p.role = 'student'
    ), '[]'::jsonb),
    'classrooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'teacher', t.full_name,
        'members', (select count(*) from classroom_members cm where cm.classroom_id = c.id)
      ) order by c.name)
      from classrooms c
      left join profiles t on t.id = c.teacher_id
      where c.school_id = v_school
    ), '[]'::jsonb)
  );
end;
$function$;
