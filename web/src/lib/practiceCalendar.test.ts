import { describe, expect, it } from 'vitest'
import { buildPracticeCalendar, levelFor, longestStreak, recordingMinutes } from './practiceCalendar'

const at = (y: number, m: number, d: number, h = 17) => new Date(y, m - 1, d, h).toISOString()

describe('practice calendar', () => {
  // Wednesday 18 Nov 2026.
  const today = new Date(2026, 10, 18, 12)

  it('weeks are Monday..Sunday columns ending with this week', () => {
    const cal = buildPracticeCalendar([], today, 4)
    expect(cal.weeks).toHaveLength(4)
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true)
    expect(cal.weeks[3][0].key).toBe('2026-11-16') // this Monday
    expect(cal.weeks[0][0].key).toBe('2026-10-26')
    expect(cal.weeks[3][2].future).toBe(false) // today
    expect(cal.weeks[3][3].future).toBe(true) // tomorrow
  })

  it('adds up recordings and minutes per day', () => {
    const cal = buildPracticeCalendar(
      [
        { created_at: at(2026, 11, 17), duration_seconds: 300 },
        { created_at: at(2026, 11, 17, 18), duration_seconds: null },
        { created_at: at(2026, 11, 16), duration_seconds: 1500 },
      ],
      today,
      2,
    )
    const tuesday = cal.weeks[1][1]
    expect(tuesday).toMatchObject({ key: '2026-11-17', recordings: 2, minutes: 6, level: 2 })
    expect(cal.weeks[1][0]).toMatchObject({ minutes: 25, level: 4 })
    expect(cal.activeDays).toBe(2)
    expect(cal.currentMonthMinutes).toBe(31)
  })

  it('this month only counts November', () => {
    const cal = buildPracticeCalendar(
      [
        { created_at: at(2026, 10, 31), duration_seconds: 600 },
        { created_at: at(2026, 11, 2), duration_seconds: 120 },
      ],
      today,
    )
    expect(cal.currentMonthMinutes).toBe(2)
  })

  it('finds the longest run of days, across months', () => {
    expect(longestStreak(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03'])).toBe(3)
    expect(longestStreak([])).toBe(0)
    expect(longestStreak(['2026-11-05', '2026-11-05'])).toBe(1)
  })

  it('labels months where they start', () => {
    const cal = buildPracticeCalendar([], today, 8)
    expect(cal.monthLabels.map((l) => l.label)).toContain('lis')
  })

  it('colour levels and minutes of unknown length', () => {
    expect([0, 1, 5, 15, 40].map(levelFor)).toEqual([0, 1, 2, 3, 4])
    expect(recordingMinutes(null)).toBe(1)
    expect(recordingMinutes(20)).toBe(1)
  })
})
