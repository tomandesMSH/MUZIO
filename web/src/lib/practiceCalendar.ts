// The practice calendar in the pupil's profile: a grid of days (weeks as
// columns, Monday on top), how much was practised each day, the longest run
// of days and this month's minutes. Pure functions - the screen passes the
// logs and today's date.
import { toDateKey } from './game-logic'

export interface CalendarLog {
  created_at: string
  duration_seconds: number | null
}

export interface CalendarDay {
  key: string // YYYY-MM-DD, local time
  date: Date
  recordings: number
  minutes: number
  // 0 = nothing, 1-4 = more and more practice (colour strength).
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
}

export interface PracticeCalendar {
  weeks: CalendarDay[][] // oldest week first, each Monday..Sunday
  // Where a new month starts: column index and its Czech short name.
  monthLabels: { column: number; label: string }[]
  longestStreak: number
  currentMonthMinutes: number
  activeDays: number // days with practice inside the grid
}

const MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']

// A recording without a known length counts as one minute (like XP).
export function recordingMinutes(durationSeconds: number | null): number {
  return durationSeconds == null ? 1 : Math.max(1, Math.round(durationSeconds / 60))
}

export function levelFor(minutes: number): CalendarDay['level'] {
  if (minutes <= 0) return 0
  if (minutes < 3) return 1
  if (minutes < 10) return 2
  if (minutes < 20) return 3
  return 4
}

// Longest run of consecutive days among the given date keys.
export function longestStreak(dateKeys: Iterable<string>): number {
  const days = [...new Set(dateKeys)].sort()
  let best = 0
  let run = 0
  let previous: Date | undefined
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const next = previous && new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1)
    run = next && toDateKey(next) === key ? run + 1 : 1
    best = Math.max(best, run)
    previous = date
  }
  return best
}

export function buildPracticeCalendar(logs: CalendarLog[], today: Date, weekCount = 18): PracticeCalendar {
  const byDay = new Map<string, { recordings: number; minutes: number }>()
  for (const log of logs) {
    const key = toDateKey(new Date(log.created_at))
    const day = byDay.get(key) ?? { recordings: 0, minutes: 0 }
    day.recordings++
    day.minutes += recordingMinutes(log.duration_seconds)
    byDay.set(key, day)
  }

  const todayKey = toDateKey(today)
  const dayOfWeek = (today.getDay() + 6) % 7 // 0 = Monday
  const firstMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek - (weekCount - 1) * 7)

  const weeks: CalendarDay[][] = []
  const monthLabels: PracticeCalendar['monthLabels'] = []
  let activeDays = 0
  for (let w = 0; w < weekCount; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + w * 7 + d)
      const key = toDateKey(date)
      const stats = byDay.get(key) ?? { recordings: 0, minutes: 0 }
      const future = key > todayKey
      if (stats.recordings > 0 && !future) activeDays++
      week.push({ key, date, ...stats, level: future ? 0 : levelFor(stats.minutes), future })
      // Label a column with the month that starts in it (or the first column).
      if (date.getDate() === 1 || (w === 0 && d === 0)) {
        if (!monthLabels.some((l) => l.column === w)) monthLabels.push({ column: w, label: MONTHS[date.getMonth()] })
      }
    }
    weeks.push(week)
  }
  // The first column's label would overlap the next one when a month starts right after.
  if (monthLabels.length > 1 && monthLabels[1].column - monthLabels[0].column < 3) monthLabels.shift()

  const monthPrefix = todayKey.slice(0, 7)
  let currentMonthMinutes = 0
  for (const [key, stats] of byDay) if (key.startsWith(monthPrefix) && key <= todayKey) currentMonthMinutes += stats.minutes

  return {
    weeks,
    monthLabels,
    longestStreak: longestStreak([...byDay.keys()].filter((k) => k <= todayKey)),
    currentMonthMinutes,
    activeDays,
  }
}
