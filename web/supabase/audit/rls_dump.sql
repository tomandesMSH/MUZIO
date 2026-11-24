-- Everything that guards the data, as one JSON value (one row, one cell):
-- RLS on each table, every policy (public + storage), every SECURITY DEFINER
-- function in public with its code, and the triggers on public.* and auth.users.
-- Run in the Supabase SQL editor, copy the cell (or Download CSV). Read only.
-- Used for the multi-school audit (Muzio-plan/docs/rls-audit.md) and to
-- compare before / after a migration that touches RLS.

select json_build_object(
  'tables', (
    select json_agg(json_build_object(
      'table', n.nspname || '.' || c.relname,
      'rls', c.relrowsecurity,
      'forced', c.relforcerowsecurity
    ) order by n.nspname, c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'storage') and c.relkind in ('r', 'p')
  ),
  'policies', (
    select json_agg(json_build_object(
      'table', schemaname || '.' || tablename,
      'name', policyname,
      'cmd', cmd,
      'roles', roles,
      'permissive', permissive,
      'using', qual,
      'check', with_check
    ) order by schemaname, tablename, policyname)
    from pg_policies
    where schemaname in ('public', 'storage')
  ),
  'definer_functions', (
    select json_agg(json_build_object(
      'name', p.proname,
      'args', pg_get_function_identity_arguments(p.oid),
      'def', pg_get_functiondef(p.oid)
    ) order by p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
  ),
  'triggers', (
    select json_agg(json_build_object(
      'table', n.nspname || '.' || c.relname,
      'name', t.tgname,
      'enabled', t.tgenabled,
      'def', pg_get_triggerdef(t.oid)
    ) order by n.nspname, c.relname, t.tgname)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))
  )
)::text as audit;
