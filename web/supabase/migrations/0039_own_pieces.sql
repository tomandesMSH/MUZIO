-- Own pieces (issue #4): a pupil adds a piece of their own choosing (a song
-- from YouTube, a piece from home) and sends recordings of it. The teacher of
-- the pupil's class sees and grades them like assigned work; they count for
-- XP and the streak the same way (XP only after the grade).
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

create table if not exists own_pieces (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  -- Optional: YouTube, the score... (https only).
  link text check (link is null or (char_length(link) <= 500 and link ~* '^https://')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists own_pieces_student on own_pieces(student_id);

alter table practice_logs add column if not exists own_piece_id uuid references own_pieces(id) on delete set null;

-- Is the pupil in one of the teacher's classes?
create or replace function teacher_has_pupil(p_teacher_id uuid, p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $function$
  select exists (
    select 1
    from classroom_members cm
    join classrooms c on c.id = cm.classroom_id
    where c.teacher_id = p_teacher_id and cm.student_id = p_student_id
  )
$function$;

alter table own_pieces enable row level security;

drop policy if exists "Zak spravuje sve skladby" on own_pieces;
create policy "Zak spravuje sve skladby" on own_pieces
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "Ucitel cte skladby svych zaku" on own_pieces;
create policy "Ucitel cte skladby svych zaku" on own_pieces
  for select using (is_admin() and teacher_has_pupil(auth.uid(), student_id));

drop policy if exists "Moderator cte skladby" on own_pieces;
create policy "Moderator cte skladby" on own_pieces
  for select using (is_moderator());

-- Recordings of an own piece are always visible to the pupil's teacher
-- (without own pieces, a recording without an assignment is only visible when
-- the pupil shares their practice - 0014). A new overload with the piece; the
-- old three-argument one stays as it was.
create or replace function teacher_can_view_practice_log(
  p_teacher_id uuid,
  p_student_id uuid,
  p_assignment_id uuid,
  p_own_piece_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $function$
  select teacher_can_view_practice_log(p_teacher_id, p_student_id, p_assignment_id)
    or (p_own_piece_id is not null and teacher_has_pupil(p_teacher_id, p_student_id))
$function$;

alter policy "Admini mohou číst všechny nahrávky" on practice_logs
  using (
    (auth.uid() = user_id)
    or (is_admin() and teacher_can_view_practice_log(auth.uid(), user_id, assignment_id, own_piece_id))
  );

alter policy "Admini mohou upravovat nahrávky" on practice_logs
  using (is_admin() and teacher_can_view_practice_log(auth.uid(), user_id, assignment_id, own_piece_id));

alter policy "Admini mohou mazat nahrávky" on practice_logs
  using (is_admin() and teacher_can_view_practice_log(auth.uid(), user_id, assignment_id, own_piece_id));

-- Badges can be given for own-piece recordings too (same rule as 0025).
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
          or (is_admin() and teacher_can_view_practice_log(auth.uid(), pl.user_id, pl.assignment_id, pl.own_piece_id))
        )
    )
  );
