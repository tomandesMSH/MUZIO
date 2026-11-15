import { supabase } from '../supabase'
import type { TeacherBadgeId } from '../game-logic'
import type { AwardedBadge, PracticeLog } from './types'

// Badges the teacher awards on a recording (migration 0025). Who may award,
// read and take back is decided by row level security, not here.

// All awards of one pupil (the pupil's own profile, the teacher's view).
export async function fetchAwardedBadges(studentId: string): Promise<AwardedBadge[]> {
  const { data, error } = await supabase
    .from('awarded_badges')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AwardedBadge[]
}

export function countAwards(awards: AwardedBadge[]): Record<TeacherBadgeId, number> {
  const counts: Record<TeacherBadgeId, number> = { 'maly-virtuoz': 0, virtuoz: 0 }
  for (const award of awards) counts[award.badge_id] += 1
  return counts
}

// Awards per recording, for showing them next to each recording.
export function awardsByLog(awards: AwardedBadge[]): Map<string, AwardedBadge[]> {
  const map = new Map<string, AwardedBadge[]>()
  for (const award of awards) {
    const key = String(award.practice_log_id)
    map.set(key, [...(map.get(key) ?? []), award])
  }
  return map
}

export async function fetchAwardsForLog(logId: string | number): Promise<AwardedBadge[]> {
  const { data, error } = await supabase.from('awarded_badges').select('*').eq('practice_log_id', logId)
  if (error) throw error
  return (data ?? []) as AwardedBadge[]
}

// Makes the recording carry exactly the badges ticked in the grading form:
// awards the new ones, takes back the unticked ones. Untouched ones stay as
// they are (keeping who gave them and when).
export async function setLogAwards(
  log: Pick<PracticeLog, 'id' | 'user_id'>,
  current: AwardedBadge[],
  wanted: ReadonlySet<TeacherBadgeId>,
): Promise<void> {
  const have = new Set(current.map((a) => a.badge_id))
  const toAdd = [...wanted].filter((id) => !have.has(id))
  const toRemove = current.filter((a) => !wanted.has(a.badge_id)).map((a) => a.id)

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('awarded_badges')
      .insert(toAdd.map((badge_id) => ({ student_id: log.user_id, practice_log_id: log.id, badge_id })))
    if (error) throw error
  }
  if (toRemove.length > 0) {
    const { error } = await supabase.from('awarded_badges').delete().in('id', toRemove)
    if (error) throw error
  }
}
