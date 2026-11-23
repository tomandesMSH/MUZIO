-- One-off: smaže všechny uživatele kromě vyjmenovaných účtů a všechno,
-- co k nim patří. Struktura (tabulky, funkce, politiky) zůstane.
--
-- Ponechané účty si nechají svoje data. Odkaz na smazaného uživatele
-- v jejich řádku (např. kdo ohodnotil nahrávku) se vynuluje, pokud sloupec
-- smí být prázdný a řádek patří ještě k něčemu jinému; jinak se řádek smaže.
-- Tabulky base44_import, migration_codes a push_sent se vyprázdní celé.
--
-- Postup v Supabase SQL editoru:
--   1. Spustit tak, jak je (p_apply = false): nic se nezmění, jen se ukáže,
--      kolik řádků je v každé tabulce teď (radku_pred) a kolik by zůstalo
--      (radku_po).
--   2. Když to sedí, změnit na konci false na true a spustit znovu.
--   3. Potom smazat soubory ve Storage: node scripts/wipe-storage.mjs
--
-- Jak to funguje: s session_replication_role = replica se nehlídají cizí
-- klíče ani nespouštějí triggery, takže se nejdřív smažou profily a pak se
-- opakovaně uklízejí řádky, které ukazují na něco, co už neexistuje (podle
-- všech cizích klíčů ve schématu public), dokud se nic nemění. Uživatelé
-- v auth.users se mažou až na konci s běžnými kaskádami (sessions,
-- identities...). Když ponechané účty nepřežijí, celé se to vrátí.

create or replace function pg_temp.muzio_wipe(p_keep text[], p_apply boolean)
returns table (tabulka text, radku_pred bigint, radku_po bigint)
language plpgsql
as $function$
declare
  v_keep uuid[];
  v_found text[];
  v_before jsonb := '{}';
  v_after jsonb := '{}';
  v_n bigint;
  v_changed boolean;
  v_pass int := 0;
  v_cond text;
  v_set text;
  v_null_ok boolean;
  r record;
  f record;
begin
  select array_agg(p.id), array_agg(p.username)
    into v_keep, v_found
  from public.profiles p
  where p.username = any(p_keep);

  if coalesce(array_length(v_keep, 1), 0) <> array_length(p_keep, 1) then
    raise exception 'Nenašel jsem všechny ponechané účty. Hledám: %, našel: %', p_keep, v_found;
  end if;
  if (select count(*) from auth.users u where u.id = any(v_keep)) <> array_length(v_keep, 1) then
    raise exception 'Některý z ponechaných profilů nemá účet v auth.users.';
  end if;

  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') order by c.relname
  loop
    execute format('select count(*) from public.%I', r.relname) into v_n;
    v_before := v_before || jsonb_build_object(r.relname, v_n);
  end loop;
  select count(*) into v_n from auth.users;
  v_before := v_before || jsonb_build_object('auth.users', v_n);

  begin
    set local session_replication_role = replica;

    delete from public.profiles where not (id = any(v_keep));
    if to_regclass('public.base44_import') is not null then
      execute 'delete from public.base44_import';
    end if;
    if to_regclass('public.migration_codes') is not null then
      execute 'delete from public.migration_codes';
    end if;
    if to_regclass('public.push_sent') is not null then
      execute 'delete from public.push_sent'; -- jen záznam o odeslaných upozorněních
    end if;

    loop
      v_pass := v_pass + 1;
      if v_pass > 50 then
        raise exception 'Úklid se nezastavil ani po 50 kolech.';
      end if;
      v_changed := false;

      for f in
        select
          con.oid,
          ch.relname as child,
          (select array_agg(a.attname order by k.ord)
             from unnest(con.conkey) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as child_cols,
          (select array_agg(a.attname order by k.ord)
             from unnest(con.confkey) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as parent_cols,
          pn.nspname as parent_schema,
          pa.relname as parent,
          con.confdeltype,
          (select bool_and(not a.attnotnull) from pg_attribute a
             where a.attrelid = con.conrelid and a.attnum = any(con.conkey)) as nullable,
          exists (
            select 1 from pg_constraint o
            where o.conrelid = con.conrelid and o.contype = 'f' and o.oid <> con.oid
              and (select bool_and(a.attnotnull) from pg_attribute a
                     where a.attrelid = o.conrelid and a.attnum = any(o.conkey))
          ) as has_other_required_fk
        from pg_constraint con
        join pg_class ch on ch.oid = con.conrelid
        join pg_namespace cn on cn.oid = ch.relnamespace
        join pg_class pa on pa.oid = con.confrelid
        join pg_namespace pn on pn.oid = pa.relnamespace
        where con.contype = 'f' and cn.nspname = 'public' and ch.relkind in ('r', 'p')
          and (pn.nspname = 'public' or (pn.nspname = 'auth' and pa.relname = 'users'))
      loop
        -- Řádky, jejichž odkaz už nikam nevede.
        if f.parent_schema = 'auth' then
          -- auth.users se maže až na konci: "neexistuje" = není mezi ponechanými.
          v_cond := format('c.%I is not null and not (c.%I = any(%L::uuid[]))',
                           f.child_cols[1], f.child_cols[1], v_keep);
        else
          select string_agg(format('c.%I is not null', cc), ' and ')
            into v_cond from unnest(f.child_cols) cc;
          select v_cond || format(' and not exists (select 1 from public.%I p where %s)', f.parent,
                   string_agg(format('p.%I = c.%I', pc, cc), ' and '))
            into v_cond
          from unnest(f.parent_cols, f.child_cols) as x(pc, cc);
        end if;

        if f.parent = 'profiles' or (f.parent_schema = 'auth' and f.parent = 'users') then
          -- Odkaz na uživatele: vynulovat, jen když řádek patří ještě k něčemu jinému.
          v_null_ok := f.nullable and (f.has_other_required_fk or f.child = 'profiles');
        else
          v_null_ok := f.nullable and f.confdeltype in ('n', 'd');
        end if;
        if f.child = 'profiles' then
          v_cond := v_cond || format(' and not (c.id = any(%L::uuid[]))', v_keep);
          if f.nullable then
            v_null_ok := true;
          end if;
        end if;

        if v_null_ok then
          select string_agg(format('%I = null', cc), ', ') into v_set from unnest(f.child_cols) cc;
          execute format('update public.%I c set %s where %s', f.child, v_set, v_cond);
        else
          execute format('delete from public.%I c where %s', f.child, v_cond);
        end if;
        get diagnostics v_n = row_count;
        if v_n > 0 then
          v_changed := true;
        end if;
      end loop;

      exit when not v_changed;
    end loop;

    set local session_replication_role = origin;
    delete from auth.users where not (id = any(v_keep));

    if (select count(*) from public.profiles) <> array_length(v_keep, 1)
       or (select count(*) from auth.users) <> array_length(v_keep, 1) then
      raise exception 'Po úklidu nesedí počet účtů, nic se nemění.';
    end if;

    for r in
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') order by c.relname
    loop
      execute format('select count(*) from public.%I', r.relname) into v_n;
      v_after := v_after || jsonb_build_object(r.relname, v_n);
    end loop;
    select count(*) into v_n from auth.users;
    v_after := v_after || jsonb_build_object('auth.users', v_n);

    if not p_apply then
      raise exception using errcode = 'MU001', message = 'jen zkouška';
    end if;
  exception when sqlstate 'MU001' then
    null; -- zkouška: všechno v bloku se vrátí, počty zůstanou v proměnných
  end;

  return query
    select b.key, b.value::bigint, (v_after ->> b.key)::bigint
    from jsonb_each_text(v_before) b
    order by (b.value::bigint - coalesce((v_after ->> b.key)::bigint, 0)) desc, b.key;
end;
$function$;

select * from pg_temp.muzio_wipe(array['testuzivatel', 'adminv', 'teacherv'], false);
