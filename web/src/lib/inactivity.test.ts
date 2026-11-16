import { describe, expect, it } from 'vitest'
import { inactivePupils, inactivityText } from './inactivity'

const today = new Date(2026, 10, 18, 12)

describe('inactivePupils', () => {
  const pupils = [
    { id: 'active', last_practice_date: '2026-11-15' },
    { id: 'week', last_practice_date: '2026-11-11' },
    { id: 'month', last_practice_date: '2026-10-10' },
    { id: 'never', last_practice_date: null },
    { id: 'waiting', last_practice_date: null, is_approved: false },
    { id: 'banned', last_practice_date: '2026-01-01', is_banned: true },
  ]

  it('lists 7+ days and never, longest gap first, never last', () => {
    expect(inactivePupils(pupils, today).map((p) => [p.pupil.id, p.days])).toEqual([
      ['month', 39],
      ['week', 7],
      ['never', null],
    ])
  })

  it('texts', () => {
    expect(inactivityText(null)).toBe('Zatím nic neposlal(a)')
    expect(inactivityText(9)).toBe('9 dní bez nahrávky')
    expect(inactivityText(20)).toBe('2 týdny bez nahrávky')
    expect(inactivityText(75)).toBe('2 měsíce bez nahrávky')
  })
})
