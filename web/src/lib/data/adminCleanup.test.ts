import { describe, expect, it, vi } from 'vitest'
import { clearedIds, defaultCleanupDate } from './adminCleanup'

vi.mock('../supabase', () => ({ supabase: {} }))

describe('defaultCleanupDate', () => {
  it('is 1 September of the current school year', () => {
    expect(defaultCleanupDate(new Date(2026, 10, 16))).toBe('2026-09-01') // November
    expect(defaultCleanupDate(new Date(2027, 2, 1))).toBe('2026-09-01') // March
    expect(defaultCleanupDate(new Date(2027, 8, 1))).toBe('2027-09-01') // 1 September
  })
})

describe('clearedIds', () => {
  it('marks recordings whose file was deleted or was already gone, never one that failed', () => {
    const batch = [
      { id: 1, path: 's/1.webm', bytes: 500 },
      { id: 2, path: 's/2.webm', bytes: 0 }, // no file in storage any more
      { id: 3, path: 's/3.webm', bytes: 800 }, // delete failed
    ]
    expect(clearedIds(batch, new Set(['s/1.webm']))).toEqual([1, 2])
  })
})
