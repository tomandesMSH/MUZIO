import { describe, expect, it, vi } from 'vitest'
import { isRecent } from './orphanRecordings'

vi.mock('../supabase', () => ({ supabase: {} }))

describe('isRecent', () => {
  it('the last 7 days count as recent', () => {
    const now = new Date('2026-11-21T12:00:00Z')
    expect(isRecent('2026-11-20T12:00:00Z', now)).toBe(true)
    expect(isRecent('2026-11-14T11:00:00Z', now)).toBe(false)
  })
})
