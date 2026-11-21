import { describe, expect, it } from 'vitest'
import { accentShades, contrast, DEFAULT_ACCENT, hexToRgb, mix, normalizeAccent } from './accent'

describe('colour helpers', () => {
  it('reads hex, short hex too', () => {
    expect(hexToRgb('#e14432')).toEqual([225, 68, 50])
    expect(hexToRgb('fff')).toEqual([255, 255, 255])
    expect(hexToRgb('nope')).toBeNull()
  })

  it('measures contrast like WCAG', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  it('mixes', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('falls back to the logo red for nonsense', () => {
    expect(normalizeAccent('xyz')).toBe(DEFAULT_ACCENT)
    expect(normalizeAccent(undefined)).toBe(DEFAULT_ACCENT)
  })
})

describe('accentShades', () => {
  it('keeps a dark enough colour as it is', () => {
    const s = accentShades('#c13628', { dark: false, base: 'classic' })
    expect(s.strong).toBe('#c13628')
    expect(s.fill).toBe('#c13628')
  })

  it('darkens a light yellow until the button text reads', () => {
    const s = accentShades('#f5d90a', { dark: false, base: 'classic' })
    expect(contrast(s.fill, '#f6f4f1')).toBeGreaterThanOrEqual(3)
    expect(contrast(s.strong, '#f6f4f1')).toBeGreaterThanOrEqual(4.5)
  })

  it('on modern dark, lightens the text shade instead', () => {
    const s = accentShades('#1d3a8a', { dark: true, base: 'modern' })
    expect(contrast(s.strong, '#19191b')).toBeGreaterThanOrEqual(4.5)
  })
})
