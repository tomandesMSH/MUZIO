-- Three counters with one meaning each (issues #3 and #4):
--
--   🔥 streak - days in a row with a recording (unchanged, record_practice_session)
--   ✨ xp     - earned from GRADED recordings, drives the pupil's level:
--               xp per recording = minutes (rounded up, 1..5) x teacher rating (1-5),
--               0 until the teacher grades it; a recording without a known
--               length (everything before this migration) counts as 1 minute
--   ⭐ stars  - given by hand by the teacher (concerts, challenges), nothing else
--
-- Until now record_practice_session added a star for every recording, the UI
-- called stars "XP", and there was no way for a teacher to give one.
--
-- XP is summed here in the database, not in the browser: a teacher only sees
-- part of a pupil's recordings (0014), so a client-side sum would differ
-- between the teacher's and the pupil's screen. profiles.xp is kept up to date
-- by a trigger on practice_logs and recomputed from scratch each time, so a
-- regraded or deleted recording corrects it automatically.
--
-- The counters (stars, streak, xp, streak freeze state) can no longer be
-- written from the app directly - before this a pupil could set their own
-- stars through the API. Only the functions below change them; they mark the
-- transaction with the muzio.trusted_counters setting, which
-- protect_profile_privileges checks.
--
-- Existing stars are reset to 0: they were 1 per recording, not awards.
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

-- 1. Recording length, measured by the app when the pupil sends it.
alter table practice_logs
  add column if not exists duration_seconds int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_logs_duration_seconds_check') then
    alter table practice_logs
      add constraint practice_logs_duration_seconds_check check (duration_seconds between 0 and 7200);
  end if;
end;
$$;

-- 2. The pupil's XP, maintained by the trigger below.
alter table profiles
  add column if not exists xp int not null default 0;

-- 3. The formula. Keep in sync with xpForLog in web/src/lib/game-logic.ts
--    (that copy only previews the number for the teacher).
create or replace function xp_for_log(p_rating int, p_duration_seconds int)
returns int
language sql
immutable
as $function$
  select case
    when p_rating is null or p_rating < 1 then 0
    else least(greatest(ceil(coalesce(p_duration_seconds, 60) / 60.0)::int, 1), 5) * least(p_rating, 5)
  end
$function$;

-- 4. Recompute one pupil's XP from all their recordings.
create or replace function recalc_xp(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform set_config('muzio.trusted_counters', 'on', true);
  update profiles p
  set xp = coalesce((
    select sum(xp_for_log(pl.rating, pl.duration_seconds))
    from practice_logs pl
    where pl.user_id = p_user_id
  ), 0)
  where p.id = p_user_id;
  perform set_config('muzio.trusted_counters', 'off', true);
end;
$function$;

revoke execute on function recalc_xp(uuid) from public, anon, authenticated;

create or replace function practice_logs_recalc_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform recalc_xp(new.user_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.user_id is distinct from new.user_id) then
    perform recalc_xp(old.user_id);
  end if;
  return null;
end;
$function$;

drop trigger if exists practice_logs_recalc_xp on practice_logs;
create trigger practice_logs_recalc_xp
  after insert or delete or update of rating, duration_seconds, user_id on practice_logs
  for each row
  execute function practice_logs_recalc_xp();

-- 4b. A new recording always starts ungraded. The insert policy (set up in
--     the dashboard, not in these migrations) only checks user_id, so without
--     this a pupil could insert a recording with rating = 5 and grant
--     themselves XP. Grading happens later as an UPDATE, which only teachers
--     may do (0014).
create or replace function practice_logs_start_ungraded()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if auth.uid() is not null and not (is_admin() or is_moderator()) then
    new.rating := null;
    new.teacher_comment := null;
    new.feedback_good := null;
    new.feedback_improve := null;
    new.graded_by := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists practice_logs_start_ungraded on practice_logs;
create trigger practice_logs_start_ungraded
  before insert on practice_logs
  for each row
  execute function practice_logs_start_ungraded();

-- 5. Counters are only written by the functions in this file (and 0015's
--    record_practice_session, replaced below). Same trigger as 0021 plus the
--    counter check; everything else is unchanged.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  -- No user session: service role, SQL editor, migrations, signup trigger.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_moderator is distinct from old.is_moderator then
    raise exception 'Roli a příznak admina nelze měnit z aplikace.';
  end if;

  if (new.stars is distinct from old.stars
      or new.streak is distinct from old.streak
      or new.xp is distinct from old.xp
      or new.streak_freezes_available is distinct from old.streak_freezes_available
      or new.streak_freeze_month is distinct from old.streak_freeze_month
      or new.last_practice_date is distinct from old.last_practice_date)
     and coalesce(current_setting('muzio.trusted_counters', true), 'off') <> 'on' then
    raise exception 'Hvězdy, XP a sérii nelze měnit přímo z aplikace.';
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.is_banned is distinct from old.is_banned
     or new.is_approved is distinct from old.is_approved then
    -- A moderator manages every account that is not itself an admin.
    if is_moderator() and old.role <> 'moderator' and not coalesce(old.is_moderator, false) then
      return new;
    end if;
    -- A verified teacher may only approve students.
    if is_admin()
       and old.role = 'student'
       and new.is_verified is not distinct from old.is_verified
       and new.is_banned is not distinct from old.is_banned then
      return new;
    end if;
    raise exception 'Tuto změnu účtu nemáš oprávnění provést.';
  end if;

  return new;
end;
$function$;

-- 6. Sending a recording now moves only the streak, no star. The return
--    shape stays the same so an older frontend keeps working.
create or replace function record_practice_session(p_user_id uuid)
returns table (stars int, streak int, streak_freezes_available smallint)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_last_date date;
  v_streak int;
  v_stars int;
  v_freezes smallint;
  v_freeze_month text;
  v_today date := (now() at time zone 'utc')::date;
  v_current_month text := to_char(v_today, 'YYYY-MM');
begin
  if p_user_id <> auth.uid() then
    raise exception 'Lze zaznamenat pouze vlastní procvičování.';
  end if;

  select p.last_practice_date, p.streak, p.stars, p.streak_freezes_available, p.streak_freeze_month
    into v_last_date, v_streak, v_stars, v_freezes, v_freeze_month
    from profiles p
    where p.id = p_user_id
    for update;

  if v_freeze_month is null or v_freeze_month <> v_current_month then
    v_freezes := 1;
    v_freeze_month := v_current_month;
  end if;

  if v_last_date = v_today then
    -- already practiced today: streak untouched
    null;
  elsif v_last_date = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  elsif v_last_date = v_today - 2 and v_freezes > 0 then
    v_freezes := v_freezes - 1;
    v_streak := coalesce(v_streak, 0) + 1;
    insert into streak_events (student_id, date, status) values (p_user_id, v_today - 1, 'freeze_used')
      on conflict (student_id, date) do update set status = 'freeze_used';
  else
    v_streak := 1;
  end if;

  insert into streak_events (student_id, date, status) values (p_user_id, v_today, 'completed')
    on conflict (student_id, date) do update set status = 'completed';

  perform set_config('muzio.trusted_counters', 'on', true);
  update profiles set
    streak = v_streak,
    last_practice_date = v_today,
    streak_freezes_available = v_freezes,
    streak_freeze_month = v_current_month
  where id = p_user_id;
  perform set_config('muzio.trusted_counters', 'off', true);

  return query select coalesce(v_stars, 0), v_streak, v_freezes;
end;
$function$;

grant execute on function record_practice_session(uuid) to authenticated;

-- 7. A teacher gives or takes back one star. Allowed for a moderator, or a
--    verified teacher (is_admin()) who has the pupil in one of their classes.
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

  return v_stars;
end;
$function$;

revoke execute on function teacher_adjust_stars(uuid, int) from public, anon;
grant execute on function teacher_adjust_stars(uuid, int) to authenticated;

-- 8. One-off: old stars were automatic (1 per recording), start from 0; and
--    fill in XP from the recordings graded so far.
update profiles set stars = 0 where stars <> 0;

update profiles p
set xp = coalesce((
  select sum(xp_for_log(pl.rating, pl.duration_seconds))
  from practice_logs pl
  where pl.user_id = p.id
), 0);

-- Checks to run by hand afterwards (each should return what its comment says):
--
--   select xp_for_log(null, 40), xp_for_log(5, 40), xp_for_log(4, 180),
--          xp_for_log(3, 720), xp_for_log(2, null);
--   -- 0, 5, 12, 15, 2
--
--   select id, full_name, xp, stars, streak from profiles where role = 'student' order by xp desc;
--   -- every pupil has stars = 0 and xp = their graded recordings
