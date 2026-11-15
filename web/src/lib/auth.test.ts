import { describe, expect, it, vi } from 'vitest'
import { generateTempPassword, makeInternalEmail } from './auth'

// These are pure helpers - keep the real client (which needs .env.local) out.
vi.mock('./supabase', () => ({ supabase: {} }))

describe('generateTempPassword', () => {
  it('has the requested length and only unambiguous characters', () => {
    const password = generateTempPassword(12)
    expect(password).toHaveLength(12)
    expect(password).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/)
  })

  it('is long enough for Supabase by default and differs between calls', () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(6)
    expect(generateTempPassword()).not.toBe(generateTempPassword())
  })
})

describe('makeInternalEmail', () => {
  it('lowercases and strips whitespace', () => {
    expect(makeInternalEmail('  TomasKral  ')).toBe('tomaskral@keyboardhero.internal')
  })

  it('removes internal spaces', () => {
    expect(makeInternalEmail('tomas kral')).toBe('tomaskral@keyboardhero.internal')
  })
})
