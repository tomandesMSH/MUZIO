import { describe, expect, it } from 'vitest'
import { pickNextToGrade } from './grading'

const log = (id: string, user_id: string, created_at: string) => ({ id, user_id, created_at })

describe('pickNextToGrade', () => {
  const pending = [
    log('a', 'pavel', '2026-11-10T10:00:00Z'),
    log('b', 'jana', '2026-11-09T10:00:00Z'),
    log('c', 'pavel', '2026-11-12T10:00:00Z'),
    log('d', 'pavel', '2026-11-11T10:00:00Z'),
  ]

  it("prefers the same pupil's oldest waiting recording", () => {
    expect(pickNextToGrade(pending, log('a', 'pavel', '2026-11-10T10:00:00Z'))?.id).toBe('d')
  })

  it("otherwise the oldest one of anyone", () => {
    expect(pickNextToGrade(pending, log('x', 'eva', '2026-11-01T00:00:00Z'))?.id).toBe('b')
  })

  it('never offers the one just graded; nothing left = undefined', () => {
    expect(pickNextToGrade([log('a', 'pavel', '2026-11-10T10:00:00Z')], log('a', 'pavel', ''))).toBeUndefined()
    expect(pickNextToGrade([], log('a', 'pavel', ''))).toBeUndefined()
  })
})
