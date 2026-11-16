-- Announcements for a class: the teacher writes a short message to the whole
-- class ("v pátek koncert v 17:00"), the pupils see it on their Dashboard and
-- get a notification (api/notify.ts, like a new assignment).
--
-- Uses is_classroom_teacher / is_classroom_member (0010). Run this manually in the Supabase SQL editor. Safe to run twice.

create table if not exists classroom_announcements (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists classroom_announcements_classroom on classroom_announcements(classroom_id, created_at desc);

alter table classroom_announcements enable row level security;

-- The class's teacher writes and deletes them.
drop policy if exists "Ucitel spravuje oznameni sve tridy" on classroom_announcements;
create policy "Ucitel spravuje oznameni sve tridy" on classroom_announcements
  for all
  using (is_classroom_teacher(classroom_id))
  with check (teacher_id = auth.uid() and is_classroom_teacher(classroom_id));

-- Pupils of the class read them.
drop policy if exists "Zak cte oznameni svych trid" on classroom_announcements;
create policy "Zak cte oznameni svych trid" on classroom_announcements
  for select using (is_classroom_member(classroom_id));

drop policy if exists "Moderator cte oznameni" on classroom_announcements;
create policy "Moderator cte oznameni" on classroom_announcements
  for select using (is_moderator());
