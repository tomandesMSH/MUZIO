// The accent of a custom style (Nastavení -> Styl -> Custom): from one colour
// the person picks, the shades the app uses - and kept readable whatever
// they pick (WCAG contrast 4.5:1 for text and for the light text on buttons).

export const DEFAULT_ACCENT = '#e14432'

const CREAM = '#f6f4f1'
const MODERN_DARK_CARD = '#19191b'
const CLASSIC_DARK_CARD = '#212327'

type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex) ?? [0, 0, 0]
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// `amount` of `b` mixed into `a` (0..1).
export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a) ?? [0, 0, 0]
  const y = hexToRgb(b) ?? [0, 0, 0]
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb)
}

// Moves `hex` towards `to` in small steps until it reaches `ratio` against
// `against`.
function untilReadable(hex: string, to: string, against: string, ratio = 4.5): string {
  let color = hex
  for (let step = 0; step < 20 && contrast(color, against) < ratio; step++) color = mix(color, to, 0.08)
  return color
}

export function normalizeAccent(hex: string | undefined): string {
  const rgb = hex ? hexToRgb(hex) : null
  return rgb ? rgbToHex(rgb) : DEFAULT_ACCENT
}

export interface AccentShades {
  fill: string // --color-coral: bars, icons, the record button
  strong: string // --color-coral-dark: text in the accent, and buttons with light text
  tint: string // --color-coral-tint: the selected menu item, soft badges
}

// Modern on dark shows primary buttons off-white (index.css), so there the
// strong shade is for text on the dark card; everywhere else it carries the
// light button text.
export function accentShades(hex: string, opts: { dark: boolean; base: 'classic' | 'modern' }): AccentShades {
  // The fill also carries light text and icons (XP pill, record button), so
  // a very light pick is darkened to 3:1 against them.
  const fill = untilReadable(normalizeAccent(hex), '#000000', CREAM, 3)
  if (opts.dark && opts.base === 'modern') {
    return { fill, strong: untilReadable(fill, '#ffffff', MODERN_DARK_CARD), tint: 'rgb(255 255 255 / 0.06)' }
  }
  // On dark the same shade is also text on a dark card, so it is darkened
  // only as far as bold button text needs (3:1); on light the full 4.5:1.
  const strong = untilReadable(fill, '#000000', CREAM, opts.dark ? 3 : 4.5)
  const tint = opts.dark ? mix(CLASSIC_DARK_CARD, fill, 0.22) : mix('#ffffff', fill, 0.14)
  return { fill, strong, tint }
}
