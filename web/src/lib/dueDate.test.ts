import { describe, expect, it } from 'vitest'
import { daysUntil, dueLabel, sortByDue } from './dueDate'

// Wednesday 18 Nov 2026, evening.
const today = new Date(2026, 10, 18, 21, 30)

describe('due dates', () => {
  it('counts whole days', () => {
    expect(daysUntil('2026-11-18', today)).toBe(0)
    expect(daysUntil('2026-11-19', today)).toBe(1)
    expect(daysUntil('2026-11-17', today)).toBe(-1)
  })

  it('labels', () => {
    expect(dueLabel(null, today)).toBeUndefined()
    expect(dueLabel('2026-11-18', today)).toEqual({ text: 'Odevzdat dnes', tone: 'soon' })
    expect(dueLabel('2026-11-19', today)).toEqual({ text: 'Odevzdat zítra', tone: 'soon' })
    expect(dueLabel('2026-11-20', today)).toEqual({ text: 'Do pátku', tone: 'soon' })
    expect(dueLabel('2026-11-23', today)).toEqual({ text: 'Do pondělí', tone: 'later' })
    expect(dueLabel('2026-12-01', today)).toEqual({ text: 'Do 1. 12.', tone: 'later' })
    expect(dueLabel('2026-11-16', today)).toEqual({ text: 'Po termínu (16. 11.)', tone: 'late' })
    expect(dueLabel('2026-11-16', today, true)).toEqual({ text: 'Termín 16. 11.', tone: 'done' })
  })

  it('nearest deadline first, no deadline last (newest first)', () => {
    const items = [
      { id: 'none-old', due_date: null, created_at: '2026-11-01' },
      { id: 'late', due_date: '2026-11-30', created_at: '2026-11-02' },
      { id: 'soon', due_date: '2026-11-19', created_at: '2026-11-03' },
      { id: 'none-new', due_date: null, created_at: '2026-11-10' },
    ]
    expect(sortByDue(items).map((i) => i.id)).toEqual(['soon', 'late', 'none-new', 'none-old'])
  })
})
