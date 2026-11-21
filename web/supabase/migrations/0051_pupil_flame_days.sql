-- Flames for the teacher: the days a pupil sent a recording, so the pupil
-- card and the list of pupils can show the flames and the world's phase.
-- A teacher can't read every recording of a pupil (0014, 0039: free practice
-- only when the pupil shares it), so these return only days and counts - no
-- recordings. A teacher already sees the pupil's streak and last practice day.
--
-- Allowed for the pupil themself, their teachers (teacher_has_pupil, 0039)
-- and an admin. Days are Czech calendar days.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

create or replace function pupil_flame_days(p_student uuid)
returns table (day date)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null
     or not (auth.uid() = p_student or is_moderator() or teacher_has_pupil(auth.uid(), p_student)) then
    raise exception 'Plamínky tohoto žáka nevidíš.';
  end if;

  return query
    select distinct (pl.created_at at time zone 'Europe/Prague')::date
    from practice_logs pl
    where pl.user_id = p_student
    order by 1;
end;
$function$;

revoke execute on function pupil_flame_days(uuid) from public, anon;
grant execute on function pupil_flame_days(uuid) to authenticated;

-- Flames of several pupils at once (the teacher's list); pupils the caller
-- may not see are left out.
create or replace function pupil_flame_counts(p_students uuid[])
returns table (student_id uuid, days int)
language sql
stable
security definer
set search_path = public
as $function$
  select pl.user_id, count(distinct (pl.created_at at time zone 'Europe/Prague')::date)::int
  from practice_logs pl
  where pl.user_id = any(p_students)
    and auth.uid() is not null
    and (pl.user_id = auth.uid() or is_moderator() or teacher_has_pupil(auth.uid(), pl.user_id))
  group by pl.user_id
$function$;

revoke execute on function pupil_flame_counts(uuid[]) from public, anon;
grant execute on function pupil_flame_counts(uuid[]) to authenticated;
