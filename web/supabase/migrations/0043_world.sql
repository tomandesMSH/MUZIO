-- The pupil's musical world (from the teacher's Base44 prototype): a garden,
-- a castle, space or a stage. The flames (days with a recording) move the
-- world through its four phases; the choice only changes how it looks.
-- Null until the pupil picks one (the app shows the garden).
--
-- The pupil changes it on their own profile row (the existing update policy);
-- protect_profile_privileges (0028) doesn't guard this column.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

alter table profiles add column if not exists world text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_world_check') then
    alter table profiles
      add constraint profiles_world_check check (world in ('zahradka', 'hrad', 'vesmir', 'podium'));
  end if;
end;
$$;
