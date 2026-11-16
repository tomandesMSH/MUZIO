import { describe, expect, it } from 'vitest'
import { LEAD_S, TAIL_S, findSoundBounds, worthCutting } from './trim'

const RATE = 8000

// Quiet room noise, with a tone between `from` and `to` seconds.
function take(total: number, from: number, to: number, noise = 0.002): Float32Array {
  let seed = 7
  return new Float32Array(Math.round(total * RATE)).map((_, i) => {
    seed = (seed * 16807) % 2147483647
    const t = i / RATE
    const room = (seed / 2147483647 - 0.5) * 2 * noise
    return room + (t >= from && t < to ? 0.4 * Math.sin(2 * Math.PI * 440 * t) : 0)
  })
}

describe('findSoundBounds', () => {
  it('finds the playing and keeps a little around it', () => {
    const b = findSoundBounds(take(10, 2.5, 8), RATE)!
    expect(b.start).toBeCloseTo(2.5 - LEAD_S, 1)
    expect(b.end).toBeCloseTo(8 + TAIL_S, 1)
  })

  it('never goes past the ends', () => {
    const b = findSoundBounds(take(5, 0.1, 4.9), RATE)!
    expect(b.start).toBe(0)
    expect(b.end).toBe(5)
  })

  it('leaves a take that is playing all the way through', () => {
    const total = 5
    expect(worthCutting(findSoundBounds(take(total, 0, total), RATE), total)).toBe(false)
  })

  it('spots a short pause at the start of a long take', () => {
    const b = findSoundBounds(take(120, 1.5, 120), RATE)!
    expect(b.start).toBeCloseTo(1.5 - LEAD_S, 1)
  })

  it('finds nothing in silence', () => {
    expect(findSoundBounds(new Float32Array(RATE * 3), RATE)).toBeUndefined()
    expect(findSoundBounds(take(3, 0, 0, 0.001), RATE)).toBeUndefined()
  })

  it('keeps quiet playing in a noisier room', () => {
    const b = findSoundBounds(take(6, 1, 5, 0.02), RATE)!
    expect(b.start).toBeCloseTo(1 - LEAD_S, 1)
    expect(b.end).toBeCloseTo(5 + TAIL_S, 1)
  })
})

describe('worthCutting', () => {
  it('only when at least half a second comes off', () => {
    expect(worthCutting({ start: 0.2, end: 9.9 }, 10)).toBe(false)
    expect(worthCutting({ start: 0.4, end: 9.8 }, 10)).toBe(true)
    expect(worthCutting(undefined, 10)).toBe(false)
  })

  it('not when almost nothing would be left', () => {
    expect(worthCutting({ start: 4, end: 4.5 }, 10)).toBe(false)
  })
})
