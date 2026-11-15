-- Admins rename accounts in the app: the full name shown everywhere, and the
-- username used to sign in.
--
-- The username is also the sign-in e-mail (<username>@keyboardhero.internal,
-- see makeInternalEmail in web/src/lib/auth.ts), so a change has to reach
-- auth.users and auth.identities too, or the person could no longer sign in.
-- Usernames follow the sign-up rules: lowercase letters, digits, dot, dash,
-- underscore, 3-32 characters, no diacritics (they break the e-mail), unique.
--
-- Allowed for an admin (is_moderator()) on any account except other
-- dedicated admin accounts (role 'moderator'); their own included.
-- Every change goes to the admin history (0027).
--
-- Run this manually in the Supabase SQL editor for the project referenced
-- in web/.env.local - it is not applied automatically. Safe to run twice.

create or replace function admin_update_account(p_user_id uuid, p_full_name text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text;
  v_old_name text;
  v_old_username text;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_username text := lower(regexp_replace(coalesce(p_username, ''), '\s+', '', 'g'));
  v_email text;
  v_details jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not is_moderator() then
    raise exception 'Účty může upravovat jen admin.';
  end if;

  select role::text, full_name, username into v_role, v_old_name, v_old_username
    from profiles where id = p_user_id for update;
  if v_role is null then
    raise exception 'Uživatel neexistuje.';
  end if;
  if v_role = 'moderator' and p_user_id <> auth.uid() then
    raise exception 'Účet jiného admina se z aplikace neupravuje.';
  end if;

  if length(v_name) < 1 or length(v_name) > 100 then
    raise exception 'Jméno musí mít 1 až 100 znaků.';
  end if;
  if v_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'Přihlašovací jméno: 3 až 32 znaků, jen malá písmena bez diakritiky, číslice, tečka, pomlčka a podtržítko.';
  end if;

  v_email := v_username || '@keyboardhero.internal';

  if v_username is distinct from v_old_username then
    if exists (select 1 from profiles where username = v_username and id <> p_user_id)
       or exists (select 1 from auth.users where lower(email) = v_email and id <> p_user_id) then
      raise exception 'Přihlašovací jméno „%“ už někdo má.', v_username;
    end if;

    update auth.users set email = v_email, updated_at = now() where id = p_user_id;
    update auth.identities
      set identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_email))
      where user_id = p_user_id and provider = 'email';
    v_details := v_details || jsonb_build_object('username_from', v_old_username, 'username_to', v_username);
  end if;

  if v_name is distinct from v_old_name then
    update auth.users
      set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(v_name))
      where id = p_user_id;
    v_details := v_details || jsonb_build_object('full_name_from', v_old_name, 'full_name_to', v_name);
  end if;

  if v_details = '{}'::jsonb then
    return; -- nothing changed
  end if;

  update profiles set full_name = v_name, username = v_username where id = p_user_id;
  perform log_admin_action('edit_account', p_user_id, v_details);
end;
$function$;

revoke execute on function admin_update_account(uuid, text, text) from public, anon;
grant execute on function admin_update_account(uuid, text, text) to authenticated;
