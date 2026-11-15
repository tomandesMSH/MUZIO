-- Badges the teacher awards by hand (issue #4):
--
--   ⭐  maly-virtuoz - for a piece played without mistakes
--   ⭐⭐ virtuoz      - for a challenge the teacher set (e.g. a scale at tempo 80)
--
-- Until now these two unlocked automatically at 10 / 50 stars. Now the
-- teacher gives them while grading a particular recording, and a pupil can
-- earn each one more than once (the profile shows "x3"). An award belongs to
-- that recording: deleting the recording removes it too.
--
-- Who may do what (same reach as grading, 0014):
--   * the pupil reads their own awards
--   * a verified teacher (is_admin()) reads awards of pupils in their classes,
--     and awards / takes back a badge on a recording they may grade
--     (teacher_can_view_practice_log) - taking back only their own award
--   * a moderator may do all of it
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

create table if not exists awarded_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  practice_log_id bigint not null references practice_logs(id) on delete cascade,
  badge_id text not null check (badge_id in ('maly-virtuoz', 'virtuoz')),
  awarded_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- one of each badge per recording
  unique (practice_log_id, badge_id)
);

create index if not exists awarded_badges_student_idx on awarded_badges (student_id);

alter table awarded_badges enable row level security;

drop policy if exists "Zak cte sve odznaky" on awarded_badges;
create policy "Zak cte sve odznaky" on awarded_badges
  for select using (student_id = auth.uid());

drop policy if exists "Ucitel cte odznaky zaku ve svych tridach" on awarded_badges;
create policy "Ucitel cte odznaky zaku ve svych tridach" on awarded_badges
  for select using (
    is_moderator()
    or (
      is_admin()
      and exists (
        select 1 from classroom_members cm
        join classrooms c on c.id = cm.classroom_id
        where c.teacher_id = auth.uid() and cm.student_id = awarded_badges.student_id
      )
    )
  );

drop policy if exists "Ucitel udeluje odznak k nahravce" on awarded_badges;
create policy "Ucitel udeluje odznak k nahravce" on awarded_badges
  for insert with check (
    awarded_by = auth.uid()
    and exists (
      select 1 from practice_logs pl
      where pl.id = awarded_badges.practice_log_id
        and pl.user_id = awarded_badges.student_id
        and (
          is_moderator()
          or (is_admin() and teacher_can_view_practice_log(auth.uid(), pl.user_id, pl.assignment_id))
        )
    )
  );

drop policy if exists "Ucitel bere zpet svuj odznak" on awarded_badges;
create policy "Ucitel bere zpet svuj odznak" on awarded_badges
  for delete using (awarded_by = auth.uid() or is_moderator());

grant select, insert, delete on awarded_badges to authenticated;
