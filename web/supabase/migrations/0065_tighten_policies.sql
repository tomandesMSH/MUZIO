-- Holes found by the RLS audit (Muzio-plan/docs/rls-audit.md), closed
-- before schools come into play. Each was checked against what the app
-- really does, so nobody should notice anything:
--  1. every signed-in user could read every profile (birth date, guardian
--     name...): pupils only read their own (others' names come from RPCs);
--  2. a verified teacher could change any profile; now only their pupils'
--     (approving a pupil is the only such change the app makes);
--  3. a teacher could delete any pupil's profile row directly; the app
--     deletes accounts with admin_delete_account (0033), which checks;
--  4. unused invite codes of the old pairing (0007) were readable and
--     redeemable by anyone; the app no longer uses them;
--  5. anyone signed in could upload into any folder of the recordings
--     bucket; now only into their own (uploadRecording: <user id>/...);
--  6. any teacher account, even an unverified one, could delete any
--     recording file; now an admin, or a verified teacher of that pupil;
--  7. a teacher could reset the password of any pupil; now of their pupils.
-- The recordings bucket stays public (the app plays recordings through
-- public URLs); switching to signed URLs is a separate change.

-- 1 ---------------------------------------------------------------------
drop policy if exists "Povolit čtení profilů pro žebříček" on public.profiles;

-- 2 ---------------------------------------------------------------------
drop policy if exists "Uživatelé mohou upravovat své profily" on public.profiles;
drop policy if exists "Povolit úpravu profilu" on public.profiles;
create policy "Povolit úpravu profilu" on public.profiles
  for update to authenticated
  using (auth.uid() = id or (is_admin() and teacher_has_pupil(auth.uid(), id)))
  with check (auth.uid() = id or (is_admin() and teacher_has_pupil(auth.uid(), id)));

-- 3 ---------------------------------------------------------------------
drop policy if exists "Ucitel muze mazat zaky" on public.profiles;

-- 4 ---------------------------------------------------------------------
drop policy if exists "Nevyuzite pozvanky jsou viditelne pro vykupeni" on public.invite_codes;
drop policy if exists "Kdokoli muze vykoupit nevyuzitou pozvanku" on public.invite_codes;

-- 5 ---------------------------------------------------------------------
drop policy if exists "Povolit nahrávání audia" on storage.objects;
create policy "Povolit nahrávání audia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

-- 6 ---------------------------------------------------------------------
drop policy if exists "Admini mohou mazat soubory ze storage" on storage.objects;
create policy "Admini mohou mazat soubory ze storage" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (
      is_moderator()
      or (
        is_admin()
        and exists (
          select 1
          from public.classroom_members cm
          join public.classrooms c on c.id = cm.classroom_id
          where c.teacher_id = auth.uid() and cm.student_id::text = (storage.foldername(objects.name))[1]
        )
      )
    )
  );

-- 7 ---------------------------------------------------------------------
create or replace function public.admin_reset_password(p_user_id uuid, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_target_role text;
  v_target_is_moderator boolean;
begin
  if auth.uid() is null then
    raise exception 'Nejsi přihlášený.';
  end if;

  -- Same minimum length Supabase Auth enforces on signUp by default.
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'Heslo musí mít alespoň 6 znaků.';
  end if;

  select role::text, (role = 'moderator' or coalesce(is_moderator, false))
    into v_target_role, v_target_is_moderator
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'Uživatel neexistuje.';
  end if;

  if v_target_is_moderator then
    raise exception 'Heslo moderátora nelze tímto způsobem změnit.';
  end if;

  if not (
    is_moderator()
    or (is_admin() and v_target_role = 'student' and teacher_has_pupil(auth.uid(), p_user_id))
  ) then
    raise exception 'K obnovení tohoto hesla nemáš oprávnění.';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  -- Sign the user out everywhere. auth.sessions cascades to refresh tokens.
  delete from auth.sessions where user_id = p_user_id;

  perform log_admin_action('reset_password', p_user_id);
end;
$function$;
