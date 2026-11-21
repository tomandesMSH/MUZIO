-- Pošta z Base44: the teacher's messages and praise from the Base44 app go
-- into the pupil's Hudební pošta (0052) when they take over their data
-- (Migrace, 0055) - so they don't lose them. Text only; the voice messages
-- were files in Base44's storage.
--
--   base44_import.messages - [{ body, created_at, read }], filled by
--                            web/scripts/import-base44.mjs
--   pupil_messages.source  - 'base44' for these; they have no Muzio teacher
--                            (teacher_id null), the app shows
--                            "Z předchozí aplikace"
--   apply_base44_import    - now also copies the messages
--
-- Needs 0052 and 0055. Run this manually in the Supabase SQL editor, then the
-- new base44_import.sql (it adds the messages, also for pupils who already
-- moved). Safe to run twice.

alter table pupil_messages alter column teacher_id drop not null;
alter table pupil_messages add column if not exists source text not null default 'muzio';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pupil_messages_source_check') then
    alter table pupil_messages add constraint pupil_messages_source_check check (source in ('muzio', 'base44'));
  end if;
end;
$$;

-- The pupil's teachers see the Base44 messages too (on the pupil card).
drop policy if exists "Ucitel cte postu z Base44" on pupil_messages;
create policy "Ucitel cte postu z Base44" on pupil_messages
  for select using (source = 'base44' and is_admin() and teacher_has_pupil(auth.uid(), student_id));

alter table base44_import add column if not exists messages jsonb not null default '[]'::jsonb;

-- Copy the Base44 messages of one import row to a pupil, once.
create or replace function copy_base44_messages(p_user uuid, p_messages jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count int := 0;
begin
  if exists (select 1 from pupil_messages where student_id = p_user and source = 'base44') then
    return 0;
  end if;
  insert into pupil_messages (teacher_id, student_id, body, created_at, read_at, source)
  select null,
         p_user,
         left(m->>'body', 1000),
         coalesce((m->>'created_at')::timestamptz, now()),
         case when (m->>'read')::boolean then coalesce((m->>'created_at')::timestamptz, now()) end,
         'base44'
  from jsonb_array_elements(p_messages) m
  where coalesce(btrim(m->>'body'), '') <> '';
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke execute on function copy_base44_messages(uuid, jsonb) from public, anon, authenticated;

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
  v_messages int := 0;
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
      null;
    end;
  end loop;

  v_messages := copy_base44_messages(p_user, v_row.messages);

  return jsonb_build_object('flames', v_row.flames, 'stars', v_row.stars, 'badges', v_badges, 'messages', v_messages);
end;
$function$;

revoke execute on function apply_base44_import(uuid, text) from public, anon, authenticated;
