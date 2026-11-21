-- The look the pupil picked (from the teacher's Base44 prototype):
-- "Pohádkový svět" with a teddy bear for younger children, "Moderní studio"
-- with a young musician in headphones for older ones. Null = pohádka.
--
-- The pupil changes it on their own profile row (the existing update policy);
-- protect_profile_privileges (0028) doesn't guard this column.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

alter table profiles add column if not exists style text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_style_check') then
    alter table profiles
      add constraint profiles_style_check check (style in ('pohadka', 'studio'));
  end if;
end;
$$;
