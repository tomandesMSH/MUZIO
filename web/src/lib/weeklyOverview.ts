// "Tento týden" on the teacher's Dashboard: per class, how many pupils
// practised, the minutes and the assignment recordings sent - this week
// (Monday to now) against last week. Pure functions; the screen passes logs.
import { recordingMinutes } from './practiceCalendar'

export interface OverviewLog {
  user_id: string
  created_at: string
  duration_seconds: number | null
  assignment_id: string | null
}

export interface WeekStats {
  practised: number // pupils with at least one recording
  minutes: number
  submitted: number // recordings for assignments
}

export interface ClassOverview {
  id: string
  name: string
  pupils: number
  thisWeek: WeekStats
  lastWeek: WeekStats
}

// Monday 00:00 of this week and of last week (local time).
export function weekStarts(now: Date): { thisWeek: Date; lastWeek: Date } {
  const dayOfWeek = (now.getDay() + 6) % 7
  const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
  const lastWeek = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7)
  return { thisWeek, lastWeek }
}

function stats(logs: OverviewLog[]): WeekStats {
  return {
    practised: new Set(logs.map((l) => l.user_id)).size,
    minutes: logs.reduce((sum, l) => sum + recordingMinutes(l.duration_seconds), 0),
    submitted: logs.filter((l) => l.assignment_id).length,
  }
}

export function classOverview(
  classrooms: { id: string; name: string }[],
  membersOf: Map<string, Set<string>>,
  logs: OverviewLog[],
  now: Date,
): ClassOverview[] {
  const { thisWeek, lastWeek } = weekStarts(now)
  return classrooms
    .map((c) => {
      const members = membersOf.get(c.id) ?? new Set<string>()
      const own = logs.filter((l) => members.has(l.user_id))
      const at = (l: OverviewLog) => new Date(l.created_at).getTime()
      return {
        id: c.id,
        name: c.name,
        pupils: members.size,
        thisWeek: stats(own.filter((l) => at(l) >= thisWeek.getTime() && at(l) <= now.getTime())),
        lastWeek: stats(own.filter((l) => at(l) >= lastWeek.getTime() && at(l) < thisWeek.getTime())),
      }
    })
    .filter((c) => c.pupils > 0)
}

// "↑ 3" / "↓ 2" / "=" against last week.
export function change(now: number, before: number): { text: string; tone: 'up' | 'down' | 'same' } {
  if (now === before) return { text: '=', tone: 'same' }
  return now > before ? { text: `↑ ${now - before}`, tone: 'up' } : { text: `↓ ${before - now}`, tone: 'down' }
}
