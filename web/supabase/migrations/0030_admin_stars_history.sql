-- Stars from the admin dashboard go to the admin history.
--
-- teacher_adjust_stars (0024) already lets an admin give or take a star to
-- any pupil; the admin dashboard now has buttons for it (Admin -> Uživatelé).
-- This re-creates the function unchanged except that a change made by an
-- admin (is_moderator(), a teacher-admin too) is logged (0027). A teacher
-- without admin rights giving stars to their own pupils is everyday work and
-- stays out of the history.
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

create or replace function teacher_adjust_stars(p_student_id uuid, p_delta int)
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text;
  v_stars int;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;

  if p_delta not in (-1, 1) then
    raise exception 'Hvězdy se přidávají a ubírají po jedné.';
  end if;

  select role::text, stars into v_role, v_stars
    from profiles
    where id = p_student_id
    for update;

  if v_role is distinct from 'student' then
    raise exception 'Hvězdy lze dávat jen žákům.';
  end if;

  if not (
    is_moderator()
    or (
      is_admin()
      and exists (
        select 1
        from classroom_members cm
        join classrooms c on c.id = cm.classroom_id
        where c.teacher_id = auth.uid() and cm.student_id = p_student_id
      )
    )
  ) then
    raise exception 'Tomuto žákovi nemůžeš dávat hvězdy.';
  end if;

  v_stars := greatest(0, coalesce(v_stars, 0) + p_delta);

  perform set_config('muzio.trusted_counters', 'on', true);
  update profiles set stars = v_stars where id = p_student_id;
  perform set_config('muzio.trusted_counters', 'off', true);

  if is_moderator() then
    perform log_admin_action('adjust_stars', p_student_id, jsonb_build_object('delta', p_delta, 'stars', v_stars));
  end if;

  return v_stars;
end;
$function$;

revoke execute on function teacher_adjust_stars(uuid, int) from public, anon;
grant execute on function teacher_adjust_stars(uuid, int) to authenticated;
