-- The policies that were made by hand in the Supabase dashboard before the
-- migrations existed, copied here word for word from the live database
-- (audit of 24. 11. 2026, web/supabase/audit/rls_dump.sql). Nothing changes:
-- each one is dropped and made again the same, so the repo is now the whole
-- picture of who may read and write what. Later migrations change them.
--
-- Some of them are too broad; see Muzio-plan/docs/rls-audit.md (fixed in
-- 0065, not here).

alter table public.profiles enable row level security;
alter table public.practice_logs enable row level security;

-- profiles ---------------------------------------------------------------

drop policy if exists "Povolit čtení profilů pro žebříček" on public.profiles;
create policy "Povolit čtení profilů pro žebříček" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "Uživatelé mohou upravovat své profily" on public.profiles;
create policy "Uživatelé mohou upravovat své profily" on public.profiles
  for update
  using (auth.uid() = id);

-- practice_logs -----------------------------------------------------------

drop policy if exists "Uživatelé vidí své nahrávky" on public.practice_logs;
create policy "Uživatelé vidí své nahrávky" on public.practice_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Uživatelé mohou vkládat své nahrávky" on public.practice_logs;
create policy "Uživatelé mohou vkládat své nahrávky" on public.practice_logs
  for insert
  with check (auth.uid() = user_id);

-- storage: the recordings bucket ----------------------------------------

drop policy if exists "Povolit nahrávání audia" on storage.objects;
create policy "Povolit nahrávání audia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recordings');

drop policy if exists "Povolit přístup k jednotlivým nahrávkám" on storage.objects;
create policy "Povolit přístup k jednotlivým nahrávkám" on storage.objects
  for select
  using (bucket_id = 'recordings');
