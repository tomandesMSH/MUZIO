-- Přehled migrace z Base44: which of the Base44 pupils have already moved
-- their data to Muzio (0055), so the teacher can nudge the others. Names and
-- numbers only - no e-mail, no hash.
--
-- For an admin (is_moderator()) and a verified teacher (is_admin()).
-- Run this manually in the Supabase SQL editor. Safe to run twice.

create or replace function base44_migration_overview()
returns table (
  base44_name text,
  flames int,
  stars int,
  badges int,
  claimed boolean,
  muzio_name text,
  claimed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not (is_moderator() or is_admin()) then
    raise exception 'Přehled migrace vidí jen učitel nebo admin.';
  end if;

  return query
    select b.full_name,
           b.flames,
           b.stars,
           coalesce(array_length(b.badges, 1), 0),
           b.claimed_by is not null,
           p.full_name,
           b.claimed_at
    from base44_import b
    left join profiles p on p.id = b.claimed_by
    order by (b.claimed_by is not null), b.full_name;
end;
$function$;

revoke execute on function base44_migration_overview() from public, anon;
grant execute on function base44_migration_overview() to authenticated;
