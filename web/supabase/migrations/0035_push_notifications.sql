-- Push notifications (web push, the "Notifikace" row in Profile):
--   * pupil: a recording was graded, a new assignment, an evening reminder
--     when they haven't practised today;
--   * teacher: a new recording to grade.
--
-- Sending happens in the Vercel function web/api/notify.ts (web-push needs
-- crypto that plpgsql doesn't have). The app calls it right after grading /
-- uploading / creating an assignment; the reminders come from pg_cron below,
-- once an hour.
--
-- Run this manually in the Supabase SQL editor. BEFORE running it, create
-- the secret that pg_cron sends to the function (the same value goes into
-- Vercel as CRON_SECRET):
--   select vault.create_secret('<long random string>', 'muzio_cron_secret');

-- 1. Where to send: one row per browser / phone that allowed notifications.
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "Vlastni odbery notifikaci" on push_subscriptions;
create policy "Vlastni odbery notifikaci" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. What to send. No row = the defaults below.
create table if not exists notification_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  graded boolean not null default true,
  assignments boolean not null default true,
  reminder boolean not null default true,
  -- Hour in Czech time (Europe/Prague).
  reminder_hour smallint not null default 18 check (reminder_hour between 14 and 21),
  recordings boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_settings enable row level security;

drop policy if exists "Vlastni nastaveni notifikaci" on notification_settings;
create policy "Vlastni nastaveni notifikaci" on notification_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. What was already sent, so a repeated call (two tabs, a retry, a page
-- that calls the function by hand) never notifies twice. Only the function
-- (service role) reads and writes it: RLS on, no policies.
create table if not exists push_sent (
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (kind, ref)
);

alter table push_sent enable row level security;

-- 4. The hourly reminder run.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'muzio-reminders') then
    perform cron.unschedule('muzio-reminders');
  end if;
end $$;

select cron.schedule(
  'muzio-reminders',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := 'https://muzio.tomandes.eu/api/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'muzio_cron_secret')
    ),
    body := '{"type":"reminders"}'::jsonb
  );
  $cron$
);

-- Check afterwards:
--   select * from cron.job where jobname = 'muzio-reminders';
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select status_code, content from net._http_response order by created desc limit 5;
