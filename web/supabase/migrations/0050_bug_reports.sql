-- "Nahlásit chybu" for the beta: anyone signed in writes what went wrong;
-- the app adds its version, the page and the browser. The admin reads them
-- in Admin -> Chyby and marks them solved.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

create table if not exists bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  app_version text check (char_length(app_version) <= 64),
  path text check (char_length(path) <= 300),
  user_agent text check (char_length(user_agent) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists bug_reports_open on bug_reports(status, created_at desc);

alter table bug_reports enable row level security;

drop policy if exists "Kazdy nahlasi chybu" on bug_reports;
create policy "Kazdy nahlasi chybu" on bug_reports
  for insert with check (user_id = auth.uid() and status = 'open');

drop policy if exists "Kazdy cte sva hlaseni" on bug_reports;
create policy "Kazdy cte sva hlaseni" on bug_reports
  for select using (user_id = auth.uid() or is_moderator());

drop policy if exists "Moderator spravuje hlaseni chyb" on bug_reports;
create policy "Moderator spravuje hlaseni chyb" on bug_reports
  for update using (is_moderator()) with check (is_moderator());
