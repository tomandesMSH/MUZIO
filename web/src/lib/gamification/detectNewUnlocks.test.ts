import { beforeEach, describe, expect, it } from 'vitest'
import { detectNewUnlocks } from './detectNewUnlocks'

const USER_ID = 'test-user'

beforeEach(() => {
  localStorage.clear()
})

describe('detectNewUnlocks', () => {
  it('reports nothing new on the very first call (seeds the baseline)', () => {
    const result = detectNewUnlocks(USER_ID, 30, { stars: 15, streak: 1, totalRecordings: 1 })
    expect(result.newLevel).toBe(false)
    expect(result.newBadgeIds).toEqual([])
    expect(result.level).toBe(2)
  })

  it('detects a new level after crossing a threshold', () => {
    detectNewUnlocks(USER_ID, 24, { stars: 5, streak: 1, totalRecordings: 1 })
    const result = detectNewUnlocks(USER_ID, 25, { stars: 5, streak: 1, totalRecordings: 1 })
    expect(result.newLevel).toBe(true)
    expect(result.level).toBe(2)
  })

  it('detects a newly unlocked badge', () => {
    detectNewUnlocks(USER_ID, 5, { stars: 5, streak: 1, totalRecordings: 1 })
    const result = detectNewUnlocks(USER_ID, 5, { stars: 5, streak: 3, totalRecordings: 1 })
    expect(result.newBadgeIds).toContain('pravidelnost')
  })

  it('reports nothing new when nothing changed', () => {
    detectNewUnlocks(USER_ID, 5, { stars: 5, streak: 1, totalRecordings: 1 })
    const result = detectNewUnlocks(USER_ID, 5, { stars: 5, streak: 1, totalRecordings: 1 })
    expect(result.newLevel).toBe(false)
    expect(result.newBadgeIds).toEqual([])
  })

  it('does not celebrate a badge again when a screen did not load the teacher awards', () => {
    detectNewUnlocks(USER_ID, 0, { totalRecordings: 1 })
    const first = detectNewUnlocks(USER_ID, 0, { totalRecordings: 1, awardedCounts: { virtuoz: 1 } })
    expect(first.newBadgeIds).toEqual(['virtuoz'])
    detectNewUnlocks(USER_ID, 0, { totalRecordings: 1 }) // e.g. the Recording screen
    const again = detectNewUnlocks(USER_ID, 0, { totalRecordings: 1, awardedCounts: { virtuoz: 1 } })
    expect(again.newBadgeIds).toEqual([])
  })
})
