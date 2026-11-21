-- Týdenní cíl: the teacher sets how many days a week the pupils of a class
-- should practise (1-7). The pupil sees "Tento týden: 3 z 5 dní" on the
-- dashboard (with several classes, the highest goal). Null = no goal.
--
-- The teacher changes it through the existing policy on classrooms
-- ("Ucitel spravuje sve ucebny", 0009). Run this manually in the Supabase
-- SQL editor. Safe to run twice.

alter table classrooms add column if not exists weekly_goal_days smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'classrooms_weekly_goal_days_check') then
    alter table classrooms
      add constraint classrooms_weekly_goal_days_check check (weekly_goal_days between 1 and 7);
  end if;
end;
$$;
