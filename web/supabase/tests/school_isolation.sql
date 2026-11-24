-- Test: schools don't see into each other (migration 0066).
-- Run the whole file in the Supabase SQL editor. It makes two test schools,
-- each with a teacher and a pupil (plus a pupil without a class), acts as
-- each of them and checks what they can see and do. Everything is rolled
-- back at the end, nothing stays in the database.
--   passed:  one row "Test izolace prošel ..."
--   failed:  an error "SELHALO n: ..." saying what leaked
-- Run it after 0066 and after every migration that touches permissions.

begin;

do $test$
declare
  school_a constant uuid := '1501a7e0-0000-4000-8000-00000000000a';
  school_b constant uuid := '1501a7e0-0000-4000-8000-00000000000b';
  teacher_a constant uuid := '1501a7e0-0000-4000-8000-0000000000a1';
  pupil_a constant uuid := '1501a7e0-0000-4000-8000-0000000000a2';
  pupil_c constant uuid := '1501a7e0-0000-4000-8000-0000000000a3'; -- school A, no class yet
  teacher_b constant uuid := '1501a7e0-0000-4000-8000-0000000000b1';
  pupil_b constant uuid := '1501a7e0-0000-4000-8000-0000000000b2';
  class_a constant uuid := '1501a7e0-0000-4000-8000-0000000000ca';
  class_b constant uuid := '1501a7e0-0000-4000-8000-0000000000cb';
  n int;
  s uuid;
begin
  -- Setup (as the SQL editor's own role) ---------------------------------
  insert into public.schools (id, name, slug) values
    (school_a, 'Test izolace A', 'test-izolace-a'),
    (school_b, 'Test izolace B', 'test-izolace-b');

  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (teacher_a, 'test-izolace-ua@keyboardhero.internal', 'authenticated', 'authenticated', '{"role":"teacher","full_name":"Test Izolace Učitel A"}'),
    (pupil_a,   'test-izolace-za@keyboardhero.internal', 'authenticated', 'authenticated', '{"role":"student","full_name":"Test Izolace Žák A"}'),
    (pupil_c,   'test-izolace-zc@keyboardhero.internal', 'authenticated', 'authenticated', '{"role":"student","full_name":"Test Izolace Žák C"}'),
    (teacher_b, 'test-izolace-ub@keyboardhero.internal', 'authenticated', 'authenticated', '{"role":"teacher","full_name":"Test Izolace Učitel B"}'),
    (pupil_b,   'test-izolace-zb@keyboardhero.internal', 'authenticated', 'authenticated', '{"role":"student","full_name":"Test Izolace Žák B"}');

  update public.profiles set school_id = school_a where id in (teacher_a, pupil_a, pupil_c);
  update public.profiles set school_id = school_b where id in (teacher_b, pupil_b);
  update public.profiles set is_verified = true where id in (teacher_a, teacher_b);
  update public.profiles set is_approved = true where id in (pupil_a, pupil_b, pupil_c);

  insert into public.classrooms (id, teacher_id, name, join_code, school_id) values
    (class_a, teacher_a, 'Test izolace A', 'ISOTESTA', school_a),
    (class_b, teacher_b, 'Test izolace B', 'ISOTESTB', school_b);
  insert into public.classroom_members (classroom_id, student_id) values
    (class_a, pupil_a),
    (class_b, pupil_b);

  -- Teacher A -----------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', teacher_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from profiles where id = pupil_a;
  if n <> 1 then raise exception 'SELHALO 1: učitel nevidí profil svého žáka'; end if;

  select count(*) into n from profiles where id in (pupil_b, teacher_b);
  if n <> 0 then raise exception 'SELHALO 2: učitel vidí profily jiné školy'; end if;

  select count(*) into n from classrooms where id = class_b;
  if n <> 0 then raise exception 'SELHALO 3: učitel vidí třídu jiné školy'; end if;

  select count(*) into n from search_school_pupils(class_a, 'Test Izolace') r where r.id = pupil_b;
  if n <> 0 then raise exception 'SELHALO 4: hledání žáků najde žáka jiné školy'; end if;

  begin
    perform invite_to_classroom(class_a, pupil_b);
    raise exception 'SELHALO 5: učitel pozval do třídy žáka jiné školy';
  exception when others then
    if sqlerrm like 'SELHALO%' then raise; end if;
  end;

  begin
    insert into classroom_members (classroom_id, student_id) values (class_a, pupil_b);
    raise exception 'SELHALO 6: učitel přidal do třídy žáka jiné školy';
  exception when others then
    if sqlerrm like 'SELHALO%' then raise; end if;
  end;

  begin
    insert into classrooms (teacher_id, name, join_code, school_id) values (teacher_a, 'Cizí', 'ISOTESTX', school_b);
    raise exception 'SELHALO 7: učitel založil třídu v jiné škole';
  exception when others then
    if sqlerrm like 'SELHALO%' then raise; end if;
  end;

  select count(*) into n from pupil_flame_counts(array[pupil_b]);
  if n <> 0 then raise exception 'SELHALO 8: učitel vidí plamínky žáka jiné školy'; end if;

  begin
    perform * from base44_migration_overview();
    raise exception 'SELHALO 9: učitel jiné než výchozí školy vidí data z Base44';
  exception when others then
    if sqlerrm like 'SELHALO%' then raise; end if;
  end;

  begin
    perform admin_reset_password(pupil_b, 'Test-izolace-1');
    raise exception 'SELHALO 10: učitel změnil heslo žákovi jiné školy';
  exception when others then
    if sqlerrm like 'SELHALO%' then raise; end if;
  end;

  -- Pupil B (in a class of school B) -------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', pupil_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform join_classroom('ISOTESTA');
    raise exception 'SELHALO 11: žák se kódem připojil do třídy jiné školy';
  exception when others then
    if sqlerrm like 'SELHALO%' then raise; end if;
  end;

  select count(*) into n from profiles where id in (pupil_a, teacher_a);
  if n <> 0 then raise exception 'SELHALO 12: žák vidí cizí profily'; end if;

  -- Pupil C (school A, no class) joins a class of school B: moves there ----
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', pupil_c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform join_classroom('ISOTESTB');
  execute 'reset role';

  select school_id into s from profiles where id = pupil_c;
  if s is distinct from school_b then raise exception 'SELHALO 13: žák bez třídy se po připojení nepřesunul do školy třídy'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', teacher_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from profiles where id = pupil_c;
  if n <> 1 then raise exception 'SELHALO 14: učitel nevidí žáka, který přišel do jeho třídy'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', teacher_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from profiles where id = pupil_c;
  if n <> 0 then raise exception 'SELHALO 15: učitel dál vidí žáka, který odešel do jiné školy'; end if;

  execute 'reset role';
end
$test$;

rollback;

select 'Test izolace prošel (testovací data jsou vrácená zpět)' as vysledek;
