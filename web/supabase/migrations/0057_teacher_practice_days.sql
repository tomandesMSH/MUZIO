-- Den cvičení od učitele: the pupil practised but sent no recording (played
-- at the lesson, sent a video another way...), so the teacher adds the day
-- by hand - as the Base44 app could. Such a day counts as a flame (and in the
-- class league), like a day with a recording. The streak is not touched; it
-- stays with record_practice_session.
--
-- Needs teacher_has_pupil (0039), pupil_flame_counts with Base44 flames
-- (0055) and class_flame_league (0054). Run this manually in the Supabase SQL
-- editor. Safe to run twice.

create table if not exists teacher_practice_days (
  student_id uuid not null references profiles(id) on delete cascade,
  day date not null,
  teacher_id uuid references profiles(id) on delete set null default auth.uid(),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (student_id, day)
);

alter table teacher_practice_days enable row level security;

drop policy if exists "Zak vidi dny od ucitele" on teacher_practice_days;
create policy "Zak vidi dny od ucitele" on teacher_practice_days
  for select using (student_id = auth.uid());

drop policy if exists "Ucitel vidi dny svych zaku" on teacher_practice_days;
create policy "Ucitel vidi dny svych zaku" on teacher_practice_days
  for select using (is_moderator() or (is_admin() and teacher_has_pupil(auth.uid(), student_id)));

-- At most 60 days back, never in the future (Czech date).
drop policy if exists "Ucitel pripise den" on teacher_practice_days;
create policy "Ucitel pripise den" on teacher_practice_days
  for insert with check (
    teacher_id = auth.uid()
    and (is_moderator() or (is_admin() and teacher_has_pupil(auth.uid(), student_id)))
    and day <= (now() at time zone 'Europe/Prague')::date
    and day >= (now() at time zone 'Europe/Prague')::date - 60
  );

drop policy if exists "Ucitel odebere den" on teacher_practice_days;
create policy "Ucitel odebere den" on teacher_practice_days
  for delete using (is_moderator() or (is_admin() and teacher_has_pupil(auth.uid(), student_id)));

-- The days with a flame: recordings and the days the teacher added.
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
    select d.day from (
      select (pl.created_at at time zone 'Europe/Prague')::date as day
      from practice_logs pl where pl.user_id = p_student
      union
      select t.day from teacher_practice_days t where t.student_id = p_student
    ) d
    order by 1;
end;
$function$;

create or replace function pupil_flame_counts(p_students uuid[])
returns table (student_id uuid, days int)
language sql
stable
security definer
set search_path = public
as $function$
  select s.id,
         ((select count(*) from (
             select (pl.created_at at time zone 'Europe/Prague')::date
             from practice_logs pl where pl.user_id = s.id
             union
             select t.day from teacher_practice_days t where t.student_id = s.id
           ) d)
          + coalesce((select b.flames from base44_import b where b.claimed_by = s.id), 0))::int
  from unnest(p_students) as s(id)
  where auth.uid() is not null
    and (s.id = auth.uid() or is_moderator() or teacher_has_pupil(auth.uid(), s.id))
$function$;

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
      (select count(*)::int from (
         select (pl.created_at at time zone 'Europe/Prague')::date as d
         from practice_logs pl
         where pl.user_id = cm.student_id
           and (pl.created_at at time zone 'Europe/Prague')::date >= v_monday
         union
         select t.day from teacher_practice_days t
         where t.student_id = cm.student_id and t.day >= v_monday
       ) w),
      cm.student_id = auth.uid()
    from classroom_members cm
    join profiles p on p.id = cm.student_id
    where cm.classroom_id = p_classroom
      and not coalesce(p.is_banned, false);
end;
$function$;
