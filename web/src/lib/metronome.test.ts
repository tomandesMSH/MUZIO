import { describe, expect, it } from 'vitest'
import { METERS, clampBpm, secondsPerBeat, tapTempo, tempoName } from './metronome'

describe('metronome', () => {
  it('keeps the tempo in range', () => {
    expect(clampBpm(10)).toBe(40)
    expect(clampBpm(300)).toBe(208)
    expect(clampBpm(99.6)).toBe(100)
    expect(secondsPerBeat(120)).toBe(0.5)
  })

  it('tap tempo averages the last taps and restarts after a pause', () => {
    expect(tapTempo([1000])).toBeUndefined()
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120)
    // a 5 s pause, then two taps 600 ms apart -> 100 BPM
    expect(tapTempo([0, 500, 5500, 6100])).toBe(100)
  })

  it('6/8 accents on 1 and 4', () => {
    expect(METERS.find((m) => m.id === '6/8')?.accents).toEqual([0, 3])
  })

  it('tempo names', () => {
    expect(tempoName(50)).toBe('Largo')
    expect(tempoName(90)).toBe('Andante')
    expect(tempoName(132)).toBe('Allegro')
  })
})
