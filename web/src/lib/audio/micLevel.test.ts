import { describe, expect, it } from 'vitest'
import { micVerdict, peakDb } from './micLevel'

describe('mic level', () => {
  it('peak in dBFS', () => {
    expect(peakDb([0, 0.5, -1])).toBeCloseTo(0)
    expect(peakDb([0.1, -0.05])).toBeCloseTo(-20)
    expect(peakDb([0, 0])).toBe(-100)
  })

  it('verdicts', () => {
    expect(micVerdict([-20, -20])).toBe('waiting')
    expect(micVerdict(Array(10).fill(-45))).toBe('quiet')
    expect(micVerdict([...Array(9).fill(-50), -12])).toBe('good')
    expect(micVerdict([...Array(7).fill(-10), -0.5, -0.2, 0])).toBe('loud')
    // one accidental peak is no problem
    expect(micVerdict([...Array(9).fill(-10), 0])).toBe('good')
  })
})
