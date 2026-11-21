import { describe, expect, it } from 'vitest'
import { artFrame, worldArtUrl, worldCoverUrl } from './worldArt'

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

describe('worldArtUrl', () => {
  it('the castle has pictures, worlds without artwork get none', () => {
    expect(worldArtUrl('hrad', 4, 28)).toMatch(/worlds\/hrad\/hrad-7\.svg$/)
    expect(worldArtUrl('hrad', 2)).toMatch(/hrad-4\.svg$/)
    expect(worldArtUrl('vesmir', 2)).toBeUndefined()
    expect(worldCoverUrl('hrad')).toMatch(/hrad-7\.svg$/)
    expect(worldCoverUrl('zahradka')).toBeUndefined()
  })
})
