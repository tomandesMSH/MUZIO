import { describe, expect, it } from 'vitest'
import { clampA4, czechOctaveName, detectPitch, median, noteFor } from './pitch'

const RATE = 48000

function tone(hz: number, harmonics = 1, length = 4096, amp = 0.5): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let v = 0
    for (let h = 1; h <= harmonics; h++) v += Math.sin((2 * Math.PI * hz * h * i) / RATE) / h
    out[i] = amp * v
  }
  return out
}

describe('detectPitch', () => {
  it.each([440, 261.63, 82.41, 196, 1318.5])('finds a %f Hz sine', (hz) => {
    const p = detectPitch(tone(hz), RATE)
    expect(p).toBeDefined()
    expect(Math.abs(1200 * Math.log2(p!.hz / hz))).toBeLessThan(3)
  })

  it('is not fooled by overtones (no octave jump)', () => {
    for (const hz of [110, 220, 146.83]) {
      const p = detectPitch(tone(hz, 6), RATE)
      expect(Math.abs(1200 * Math.log2(p!.hz / hz))).toBeLessThan(5)
    }
  })

  it('ignores silence and noise', () => {
    expect(detectPitch(new Float32Array(4096), RATE)).toBeUndefined()
    let seed = 1
    const noise = new Float32Array(4096).map(() => {
      seed = (seed * 16807) % 2147483647
      return (seed / 2147483647 - 0.5) * 0.6
    })
    expect(detectPitch(noise, RATE)).toBeUndefined()
  })
})

describe('noteFor', () => {
  it('names notes the Czech way', () => {
    expect(noteFor(440)).toMatchObject({ name: 'A', octave: 4, czech: 'a¹', cents: 0 })
    expect(noteFor(261.63)).toMatchObject({ name: 'C', czech: 'c¹', cents: 0 })
    expect(noteFor(466.16).name).toBe('B')
    expect(noteFor(493.88).name).toBe('H')
    expect(noteFor(82.41)).toMatchObject({ name: 'E', octave: 2, czech: 'E' })
    expect(noteFor(277.18).czech).toBe('cis¹')
  })

  it('says how far off it is', () => {
    expect(noteFor(445).cents).toBe(20)
    expect(noteFor(435).cents).toBe(-20)
    // With A = 442 a 442 Hz tone is spot on.
    expect(noteFor(442, 442).cents).toBe(0)
  })

  it('spells low octaves', () => {
    expect(czechOctaveName('C', 3)).toBe('c')
    expect(czechOctaveName('A', 1)).toBe('A₁')
    expect(czechOctaveName('E', 6)).toBe('e³')
  })
})

describe('helpers', () => {
  it('median and A4 limits', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(clampA4(500)).toBe(450)
    expect(clampA4(441.4)).toBe(441)
  })
})
