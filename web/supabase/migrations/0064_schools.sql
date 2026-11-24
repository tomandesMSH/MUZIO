-- More schools in one installation, step 2 (Muzio-plan/docs/plan-vice-skol.md).
-- Adds schools, puts every profile and classroom into "Výchozí škola" and
-- adds the helper functions the policies will use in step 3. Nothing reads
-- the new columns yet, so nothing changes for anyone.

-- Schools ---------------------------------------------------------------

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  plan text,
  created_at timestamptz not null default now()
);

insert into public.schools (name, slug)
values ('Výchozí škola', 'vychozi')
on conflict (slug) do nothing;

-- The school new rows get when nothing says otherwise.
create or replace function public.default_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from schools where slug = 'vychozi'
$$;

-- Links to join a school as its admin or a teacher (used from step 4).
create table if not exists public.school_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  role text not null check (role in ('school_admin', 'teacher')),
  code text not null unique,
  expires_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists school_invites_school_idx on public.school_invites(school_id);

-- Profiles and classrooms belong to a school ----------------------------

alter table public.profiles
  add column if not exists school_id uuid references public.schools(id),
  add column if not exists is_school_admin boolean not null default false;
update public.profiles set school_id = public.default_school_id() where school_id is null;
alter table public.profiles alter column school_id set default public.default_school_id();
alter table public.profiles alter column school_id set not null;
create index if not exists profiles_school_idx on public.profiles(school_id);

alter table public.classrooms
  add column if not exists school_id uuid references public.schools(id);
update public.classrooms c
  set school_id = coalesce((select p.school_id from public.profiles p where p.id = c.teacher_id), public.default_school_id())
  where c.school_id is null;
create index if not exists classrooms_school_idx on public.classrooms(school_id);

-- Helpers for the policies (step 3) --------------------------------------

create or replace function public.my_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- A new classroom is in its teacher's school.
alter table public.classrooms
  alter column school_id set default coalesce(public.my_school_id(), public.default_school_id());
alter table public.classrooms alter column school_id set not null;

create or replace function public.same_school(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = p_user and school_id = (select school_id from profiles where id = auth.uid())
  )
$$;

create or replace function public.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'teacher' and is_school_admin
  )
$$;

-- RLS on the new tables -------------------------------------------------

alter table public.schools enable row level security;
drop policy if exists "Skolu vidi jeji lide a admin" on public.schools;
create policy "Skolu vidi jeji lide a admin" on public.schools
  for select
  using (id = my_school_id() or is_moderator());
drop policy if exists "Skoly spravuje admin" on public.schools;
create policy "Skoly spravuje admin" on public.schools
  for all
  using (is_moderator())
  with check (is_moderator());

alter table public.school_invites enable row level security;
drop policy if exists "Pozvanky do skol spravuje admin" on public.school_invites;
create policy "Pozvanky do skol spravuje admin" on public.school_invites
  for all
  using (is_moderator())
  with check (is_moderator());

-- The school and its admin flag are not changed from the app ---------------
-- Same as 0028, plus the school_id / is_school_admin check.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  -- No user session: service role, SQL editor, migrations, signup trigger.
  if auth.uid() is null then
    return new;
  end if;

  if (new.role is distinct from old.role
      or new.is_moderator is distinct from old.is_moderator
      or new.school_id is distinct from old.school_id
      or new.is_school_admin is distinct from old.is_school_admin)
     and coalesce(current_setting('muzio.trusted_admin', true), 'off') <> 'on' then
    raise exception 'Roli, školu a příznak admina nelze měnit z aplikace.';
  end if;

  if (new.stars is distinct from old.stars
      or new.streak is distinct from old.streak
      or new.xp is distinct from old.xp
      or new.streak_freezes_available is distinct from old.streak_freezes_available
      or new.streak_freeze_month is distinct from old.streak_freeze_month
      or new.last_practice_date is distinct from old.last_practice_date)
     and coalesce(current_setting('muzio.trusted_counters', true), 'off') <> 'on' then
    raise exception 'Hvězdy, XP a sérii nelze měnit přímo z aplikace.';
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.is_banned is distinct from old.is_banned
     or new.is_approved is distinct from old.is_approved then
    if coalesce(current_setting('muzio.trusted_admin', true), 'off') = 'on' then
      return new;
    end if;
    -- A moderator manages every account that is not itself an admin.
    if is_moderator() and old.role <> 'moderator' and not coalesce(old.is_moderator, false) then
      return new;
    end if;
    -- A verified teacher may only approve students.
    if is_admin()
       and old.role = 'student'
       and new.is_verified is not distinct from old.is_verified
       and new.is_banned is not distinct from old.is_banned then
      return new;
    end if;
    raise exception 'Tuto změnu účtu nemáš oprávnění provést.';
  end if;

  return new;
end;
$function$;

-- Check afterwards (both 0):
--   select count(*) from profiles where school_id is null;
--   select count(*) from classrooms where school_id is null;
