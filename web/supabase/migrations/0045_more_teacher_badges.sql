-- Seven more badges the teacher gives while grading a recording (from the
-- teacher's Base44 prototype), next to maly-virtuoz and virtuoz (0025):
--
--   lovec-not           - a piece learnt correctly from the score
--   akordovy-kouzelnik  - a sequence of chords played smoothly
--   rytmicky-mistr      - a big improvement in rhythm
--   velky-pokrok        - personal musical progress
--   maly-skladatel      - an own musical idea or piece
--   odvazny-muzikant    - getting past a hard passage
--   koncertni-hvezda    - performing in front of an audience
--
-- Only the list of allowed ids changes; who may award stays as in 0025.
-- Keep in sync with TEACHER_BADGE_IDS in web/src/lib/game-logic.ts.
--
-- Run this manually in the Supabase SQL editor. Safe to run twice.

alter table awarded_badges drop constraint if exists awarded_badges_badge_id_check;
alter table awarded_badges
  add constraint awarded_badges_badge_id_check check (badge_id in (
    'maly-virtuoz', 'virtuoz',
    'lovec-not', 'akordovy-kouzelnik', 'rytmicky-mistr', 'velky-pokrok',
    'maly-skladatel', 'odvazny-muzikant', 'koncertni-hvezda'
  ));
