import { describe, expect, it } from 'vitest'
import { artFrame, worldArt, worldCover } from './worldArt'

describe('artFrame', () => {
  it('first picture before any flame, last for a finished world', () => {
    expect(artFrame(7, 0)).toBe(1)
    expect(artFrame(7, 28)).toBe(7)
  })

  it('grows with the flames and lands on a new picture at each phase', () => {
    const frames = Array.from({ length: 29 }, (_, f) => artFrame(7, f))
    for (let f = 1; f <= 28; f++) expect(frames[f]).toBeGreaterThanOrEqual(frames[f - 1])
    expect([7, 14, 21].map((f) => artFrame(7, f))).toEqual([3, 4, 6])
  })
})

describe('worldArt', () => {
  it('the castle: a line drawing for every picture', () => {
    expect(worldArt('hrad', 4, 28)).toMatchObject({ kind: 'lines', reveal: 1 })
    expect(worldArt('hrad', 4, 28)?.url).toMatch(/worlds\/hrad\/hrad-7\.svg$/)
    expect(worldArt('hrad', 2)?.url).toMatch(/hrad-4\.svg$/)
    expect(worldCover('hrad')?.url).toMatch(/hrad-7\.svg$/)
  })

  it('a world without artwork: nothing, the placeholder is shown', () => {
    expect(worldArt('zahradka', 0, 0)).toBeUndefined()
    expect(worldCover('podium')).toBeUndefined()
  })
})
