import { afterEach, describe, expect, it } from 'vitest'
import { detectFlameMilestone } from './detectFlameMilestone'

describe('detectFlameMilestone', () => {
  afterEach(() => localStorage.clear())

  it('only notes the progress the first time', () => {
    expect(detectFlameMilestone('u1', 15)).toBeNull()
    expect(detectFlameMilestone('u1', 16)).toBeNull()
  })

  it('celebrates each phase once: 7, 14, 21, 28, then the next round', () => {
    detectFlameMilestone('u1', 6)
    expect(detectFlameMilestone('u1', 7)).toBe(1)
    expect(detectFlameMilestone('u1', 7)).toBeNull()
    expect(detectFlameMilestone('u1', 14)).toBe(2)
    expect(detectFlameMilestone('u1', 21)).toBe(3)
    expect(detectFlameMilestone('u1', 28)).toBe(4)
    expect(detectFlameMilestone('u1', 35)).toBe(1)
  })

  it('keeps users apart', () => {
    detectFlameMilestone('u1', 6)
    detectFlameMilestone('u2', 13)
    expect(detectFlameMilestone('u1', 7)).toBe(1)
    expect(detectFlameMilestone('u2', 14)).toBe(2)
  })
})
