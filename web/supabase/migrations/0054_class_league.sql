-- Žebříček třídy: who in the class has the most flames (days with a
-- recording) this week, from Monday, Czech time. Pupils can't read each
-- other's recordings or profiles, so this returns only a short name (first
-- name and the initial of the surname), the number of days and which row is
-- the caller. The app shows the top five and the pupil's own place.
--
-- For a member of the class, its teacher (is_classroom_member /
-- is_classroom_teacher, 0010) and an admin. Run this manually in the
-- Supabase SQL editor. Safe to run twice.

create or replace function class_flame_league(p_classroom uuid)
returns table (short_name text, days int, is_me boolean)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_monday date := date_trunc('week', (now() at time zone 'Europe/Prague'))::date;
begin
  if auth.uid() is null
     or not (is_classroom_member(p_classroom) or is_classroom_teacher(p_classroom) or is_moderator()) then
    raise exception 'Žebříček této třídy nevidíš.';
  end if;

  return query
    select
      trim(split_part(btrim(p.full_name), ' ', 1)
        || coalesce(' ' || nullif(left(split_part(btrim(p.full_name), ' ', 2), 1), '') || '.', '')),
      coalesce((
        select count(distinct (pl.created_at at time zone 'Europe/Prague')::date)::int
        from practice_logs pl
        where pl.user_id = cm.student_id
          and (pl.created_at at time zone 'Europe/Prague')::date >= v_monday
      ), 0),
      cm.student_id = auth.uid()
    from classroom_members cm
    join profiles p on p.id = cm.student_id
    where cm.classroom_id = p_classroom
      and not coalesce(p.is_banned, false);
end;
$function$;

revoke execute on function class_flame_league(uuid) from public, anon;
grant execute on function class_flame_league(uuid) to authenticated;
