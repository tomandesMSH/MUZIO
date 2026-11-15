import { describe, expect, it, vi } from 'vitest'
import { formatBytes, usageLevel } from './adminUsage'

vi.mock('../supabase', () => ({ supabase: {} }))

describe('formatBytes', () => {
  it('picks kB, MB or GB with a Czech decimal comma', () => {
    expect(formatBytes(300 * 1024)).toBe('300 kB')
    expect(formatBytes(12.34 * 1024 * 1024)).toBe('12,3 MB')
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1,50 GB')
  })
})

describe('usageLevel', () => {
  it('warns from 70 % and calls it full from 90 %', () => {
    expect(usageLevel(50, 100)).toEqual({ share: 0.5, tone: 'ok' })
    expect(usageLevel(70, 100).tone).toBe('warn')
    expect(usageLevel(95, 100).tone).toBe('full')
  })
})
