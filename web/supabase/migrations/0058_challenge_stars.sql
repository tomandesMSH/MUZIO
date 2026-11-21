-- Výzvy s hvězdami (like the Base44 tasks with stars_reward): an assignment
-- can promise 1-5 stars. A pupil gets them once, when the teacher grades
-- their recording for it for the first time - not for just sending
-- something. challenge_rewards remembers who got them, so regrading or a
-- second recording doesn't add more.
--
-- Stars are changed under muzio.trusted_counters, like teacher_adjust_stars
-- (0024/0030). Run this manually in the Supabase SQL editor. Safe to run twice.

alter table assignments add column if not exists stars_reward smallint not null default 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assignments_stars_reward_check') then
    alter table assignments add constraint assignments_stars_reward_check check (stars_reward between 0 and 5);
  end if;
end;
$$;

create table if not exists challenge_rewards (
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  practice_log_id bigint references practice_logs(id) on delete set null,
  stars smallint not null,
  awarded_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

alter table challenge_rewards enable row level security;

drop policy if exists "Odmeny za vyzvy cte zak a ucitel" on challenge_rewards;
create policy "Odmeny za vyzvy cte zak a ucitel" on challenge_rewards
  for select using (
    student_id = auth.uid() or is_moderator() or (is_admin() and teacher_has_pupil(auth.uid(), student_id))
  );

create or replace function practice_logs_challenge_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_reward smallint;
begin
  if new.assignment_id is null or new.rating is null or old.rating is not null then
    return null;
  end if;
  select stars_reward into v_reward from assignments where id = new.assignment_id;
  if coalesce(v_reward, 0) <= 0 then
    return null;
  end if;

  insert into challenge_rewards (assignment_id, student_id, practice_log_id, stars)
  values (new.assignment_id, new.user_id, new.id, v_reward)
  on conflict (assignment_id, student_id) do nothing;
  if not found then
    return null;
  end if;

  perform set_config('muzio.trusted_counters', 'on', true);
  update profiles set stars = coalesce(stars, 0) + v_reward where id = new.user_id;
  perform set_config('muzio.trusted_counters', 'off', true);
  return null;
end;
$function$;

drop trigger if exists practice_logs_challenge_reward on practice_logs;
create trigger practice_logs_challenge_reward
  after update of rating on practice_logs
  for each row
  execute function practice_logs_challenge_reward();
