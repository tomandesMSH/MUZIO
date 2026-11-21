-- Migrace z Base44: pupils who used the teacher's Base44 prototype bring
-- their flames, stars and badges into a new Muzio account.
--
--   base44_import   - one row per Base44 pupil, filled once from the export
--                     (web/scripts/import-base44.mjs). The e-mail is stored
--                     only as sha256(lower(trim(email))), never readable.
--   migration_codes - the one-time code mailed to that address; only its hash
--   apply_base44_import(user, hash) - called by api/migrate.ts (service role)
--                     after the code checks out and the account exists
--
-- Flames stay in base44_import (claimed_by), not in profiles, so nobody can
-- raise them through the API; the app adds them to the days from
-- practice_logs (imported_flames, pupil_flame_counts). Imported badges go to
-- awarded_badges without a recording (practice_log_id null, source 'base44').
--
-- Needs 0024 (trusted counters), 0025, 0039 (teacher_has_pupil), 0045, 0051.
-- Run this manually in the Supabase SQL editor. Safe to run twice.

-- 1. Badges without a recording, marked where they came from.
alter table awarded_badges alter column practice_log_id drop not null;
alter table awarded_badges add column if not exists source text not null default 'muzio';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'awarded_badges_source_check') then
    alter table awarded_badges add constraint awarded_badges_source_check check (source in ('muzio', 'base44'));
  end if;
end;
$$;

-- 2. The Base44 data.
create table if not exists base44_import (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique check (email_hash ~ '^[0-9a-f]{64}$'),
  full_name text,
  stars int not null default 0 check (stars >= 0),
  flames int not null default 0 check (flames >= 0),
  badges text[] not null default '{}',
  claimed_by uuid references profiles(id) on delete set null,
  claimed_at timestamptz,
  imported_at timestamptz not null default now()
);

alter table base44_import enable row level security;

-- The pupil reads their own claimed row (the flames on the dashboard), their
-- teachers and an admin read it too. Nobody writes from the app.
drop policy if exists "Prevzata data z Base44" on base44_import;
create policy "Prevzata data z Base44" on base44_import
  for select using (
    claimed_by is not null
    and (claimed_by = auth.uid() or is_moderator() or teacher_has_pupil(auth.uid(), claimed_by))
  );

-- 3. Codes: only the service role (api/migrate.ts) touches them.
create table if not exists migration_codes (
  email_hash text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_count int not null default 1,
  window_start timestamptz not null default now()
);
alter table migration_codes enable row level security;

-- 4. Claim the data for a new account: stars added, badges given, flames
--    kept on the row. Once per Base44 pupil. Returns what was brought over.
create or replace function apply_base44_import(p_user uuid, p_email_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row base44_import%rowtype;
  v_badge text;
  v_badges int := 0;
begin
  select * into v_row from base44_import where email_hash = p_email_hash for update;
  if not found then
    raise exception 'Tento e-mail v datech z Base44 nemáme.';
  end if;
  if v_row.claimed_by is not null then
    raise exception 'Data z Base44 už si někdo převzal.';
  end if;

  update base44_import set claimed_by = p_user, claimed_at = now() where id = v_row.id;

  if v_row.stars > 0 then
    perform set_config('muzio.trusted_counters', 'on', true);
    update profiles set stars = coalesce(stars, 0) + v_row.stars where id = p_user;
    perform set_config('muzio.trusted_counters', 'off', true);
  end if;

  foreach v_badge in array v_row.badges loop
    begin
      insert into awarded_badges (student_id, practice_log_id, badge_id, awarded_by, source)
      values (p_user, null, v_badge, p_user, 'base44');
      v_badges := v_badges + 1;
    exception when check_violation then
      -- A badge Muzio doesn't know: skipped.
      null;
    end;
  end loop;

  return jsonb_build_object('flames', v_row.flames, 'stars', v_row.stars, 'badges', v_badges);
end;
$function$;

revoke execute on function apply_base44_import(uuid, text) from public, anon, authenticated;

-- 5. Flames brought from Base44, for the pupil, their teachers and an admin.
create or replace function imported_flames(p_student uuid)
returns int
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce((
    select flames from base44_import
    where claimed_by = p_student
      and auth.uid() is not null
      and (p_student = auth.uid() or is_moderator() or teacher_has_pupil(auth.uid(), p_student))
  ), 0)
$function$;

revoke execute on function imported_flames(uuid) from public, anon;
grant execute on function imported_flames(uuid) to authenticated;

-- 6. The teacher's list of pupils (0051) counts the Base44 flames too.
create or replace function pupil_flame_counts(p_students uuid[])
returns table (student_id uuid, days int)
language sql
stable
security definer
set search_path = public
as $function$
  select s.id,
         (coalesce((
           select count(distinct (pl.created_at at time zone 'Europe/Prague')::date)
           from practice_logs pl where pl.user_id = s.id
         ), 0) + coalesce((select b.flames from base44_import b where b.claimed_by = s.id), 0))::int
  from unnest(p_students) as s(id)
  where auth.uid() is not null
    and (s.id = auth.uid() or is_moderator() or teacher_has_pupil(auth.uid(), s.id))
$function$;
