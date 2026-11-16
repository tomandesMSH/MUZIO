-- Private notes about a pupil: what to go over next lesson, what to watch
-- out for. Only the teacher who wrote them sees them - not the pupil, not
-- other teachers, not the admins. One note per teacher and pupil.
--
-- Needs 0039 (teacher_has_pupil). Run this manually in the Supabase SQL
-- editor. Safe to run twice.

create table if not exists teacher_student_notes (
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);
create index if not exists teacher_student_notes_student on teacher_student_notes(student_id);

alter table teacher_student_notes enable row level security;

drop policy if exists "Ucitel spravuje sve poznamky" on teacher_student_notes;
create policy "Ucitel spravuje sve poznamky" on teacher_student_notes
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and is_admin() and teacher_has_pupil(auth.uid(), student_id));
