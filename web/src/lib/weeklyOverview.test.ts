import { describe, expect, it } from 'vitest'
import { change, classOverview, weekStarts } from './weeklyOverview'

const now = new Date(2026, 10, 18, 12) // Wednesday 18. 11.
const at = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString()
const log = (user: string, day: number, extra: Partial<{ duration_seconds: number | null; assignment_id: string | null }> = {}) => ({
  user_id: user,
  created_at: at(day),
  duration_seconds: 120,
  assignment_id: null,
  ...extra,
})

describe('weekStarts', () => {
  it('Monday of this and last week', () => {
    const { thisWeek, lastWeek } = weekStarts(now)
    expect(thisWeek).toEqual(new Date(2026, 10, 16))
    expect(lastWeek).toEqual(new Date(2026, 10, 9))
    // On a Sunday the week still began last Monday.
    expect(weekStarts(new Date(2026, 10, 22, 20)).thisWeek).toEqual(new Date(2026, 10, 16))
  })
})

describe('classOverview', () => {
  const classes = [
    { id: 'c1', name: 'Housle' },
    { id: 'c2', name: 'Prázdná' },
  ]
  const members = new Map([['c1', new Set(['a', 'b', 'c'])]])

  it('this week against last week, per class', () => {
    const rows = classOverview(
      classes,
      members,
      [
        log('a', 16, { assignment_id: 'x' }),
        log('a', 17),
        log('b', 18, { duration_seconds: 300 }),
        log('a', 10),
        log('z', 17), // not in the class
        log('c', 8), // two weeks ago
      ],
      now,
    )
    expect(rows).toHaveLength(1) // a class without pupils is left out
    expect(rows[0]).toMatchObject({
      name: 'Housle',
      pupils: 3,
      thisWeek: { practised: 2, minutes: 9, submitted: 1 },
      lastWeek: { practised: 1, minutes: 2, submitted: 0 },
    })
  })
})

describe('change', () => {
  it('up, down or the same', () => {
    expect(change(5, 3)).toEqual({ text: '↑ 2', tone: 'up' })
    expect(change(1, 4)).toEqual({ text: '↓ 3', tone: 'down' })
    expect(change(2, 2)).toEqual({ text: '=', tone: 'same' })
  })
})
