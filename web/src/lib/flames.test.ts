import { describe, expect, it } from 'vitest'
import { countPracticeDays, flameProgress, flamesLabel } from './flames'

describe('countPracticeDays', () => {
  it('counts each day once, gaps do not matter', () => {
    expect(countPracticeDays(['2026-11-01', '2026-11-01', '2026-11-05', '2026-11-20'])).toBe(3)
    expect(countPracticeDays([])).toBe(0)
  })
})

describe('flameProgress', () => {
  it('starts empty', () => {
    expect(flameProgress(0)).toEqual({
      total: 0,
      completedCycles: 0,
      inCycle: 0,
      phasesDone: 0,
      filled: 0,
      toNextPhase: 7,
      atMilestone: false,
    })
  })

  it('fills the row of seven', () => {
    const p = flameProgress(3)
    expect(p.filled).toBe(3)
    expect(p.toNextPhase).toBe(4)
    expect(p.phasesDone).toBe(0)
  })

  it('keeps the full row on the day a phase is reached', () => {
    const p = flameProgress(7)
    expect(p).toMatchObject({ phasesDone: 1, filled: 7, atMilestone: true, toNextPhase: 7 })
    expect(flameProgress(8)).toMatchObject({ phasesDone: 1, filled: 1, atMilestone: false, toNextPhase: 6 })
  })

  it('phases at 7, 14, 21 and 28', () => {
    expect([7, 14, 21, 28].map((n) => flameProgress(n).phasesDone)).toEqual([1, 2, 3, 4])
  })

  it('shows the finished world until the next day, then a new round', () => {
    expect(flameProgress(28)).toMatchObject({ inCycle: 28, phasesDone: 4, completedCycles: 1, atMilestone: true })
    expect(flameProgress(29)).toMatchObject({ inCycle: 1, phasesDone: 0, completedCycles: 1, filled: 1 })
    expect(flameProgress(56)).toMatchObject({ inCycle: 28, phasesDone: 4, completedCycles: 2 })
  })

  it('ignores nonsense', () => {
    expect(flameProgress(-3).total).toBe(0)
    expect(flameProgress(Number.NaN).total).toBe(0)
  })
})

describe('flamesLabel', () => {
  it('uses Czech plural forms', () => {
    expect([1, 2, 4, 5, 7].map(flamesLabel)).toEqual(['1 plamínek', '2 plamínky', '4 plamínky', '5 plamínků', '7 plamínků'])
  })
})
