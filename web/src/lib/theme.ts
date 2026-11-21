// Light / dark / as the phone or computer has it ("Podle systému", the
// default). The choice is kept in this browser; the dark class goes on <html>.
import { useSyncExternalStore } from 'react'
import { accentShades, DEFAULT_ACCENT, normalizeAccent } from './accent'

export type ThemeChoice = 'light' | 'dark' | 'system'
// The look on top of light/dark: the original "clay" one, the quieter
// modern one (data-style="modern" on <html>, see index.css), or the person's
// own (custom: one of the two as a base plus their accent, font, corners,
// surfaces and text size, set as CSS variables on <html>).
export type StyleChoice = 'classic' | 'modern' | 'custom'

export interface CustomStyle {
  base: 'classic' | 'modern'
  accent: string
  font: 'inter' | 'poppins' | 'atkinson'
  radius: 'sharp' | 'medium' | 'round'
  surfaces: 'clay' | 'lines'
  textSize: 'small' | 'normal' | 'large'
}

export const DEFAULT_CUSTOM_STYLE: CustomStyle = {
  base: 'classic',
  accent: DEFAULT_ACCENT,
  font: 'poppins',
  radius: 'round',
  surfaces: 'clay',
  textSize: 'normal',
}

// A new key: the old one ('muzio-theme') was written as 'light' for everyone
// on every start, so it can't tell a real choice from the old default.
const CHOICE_KEY = 'muzio-theme-choice'
const OLD_KEY = 'muzio-theme'
const STYLE_KEY = 'muzio-style'
const CUSTOM_KEY = 'muzio-custom-style'

const FONTS: Record<CustomStyle['font'], string> = {
  inter: "'Inter', 'Segoe UI', sans-serif",
  poppins: "'Poppins', 'Segoe UI', sans-serif",
  atkinson: "'Atkinson Hyperlegible', 'Segoe UI', sans-serif",
}
const RADII: Record<CustomStyle['radius'], [string, string, string, string]> = {
  sharp: ['4px', '6px', '8px', '10px'],
  medium: ['8px', '10px', '12px', '16px'],
  round: ['0.5rem', '0.75rem', '1rem', '1.5rem'],
}
const TEXT_SIZES: Record<CustomStyle['textSize'], string> = { small: '93.75%', normal: '100%', large: '112.5%' }
const CUSTOM_PROPS = [
  '--color-coral',
  '--color-coral-dark',
  '--color-coral-tint',
  '--font-heading',
  '--font-body',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
  '--radius-3xl',
]

const listeners = new Set<() => void>()
// Bumped on every custom style change, so useTheme re-renders its readers.
let customVersion = 0
let media: MediaQueryList | undefined

function darkQuery(): MediaQueryList | undefined {
  if (!media && typeof window !== 'undefined' && window.matchMedia) {
    media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener?.('change', () => {
      if (getThemeChoice() === 'system') paint()
      emit()
    })
  }
  return media
}

function emit() {
  for (const listener of listeners) listener()
}

export function getThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(CHOICE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    // Someone who had turned dark mode on keeps it.
    if (localStorage.getItem(OLD_KEY) === 'dark') return 'dark'
  } catch {
    // Storage unavailable: follow the system.
  }
  return 'system'
}

export function getStyleChoice(): StyleChoice {
  try {
    const saved = localStorage.getItem(STYLE_KEY)
    return saved === 'modern' || saved === 'custom' ? saved : 'classic'
  } catch {
    return 'classic'
  }
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

// The saved custom style; anything missing or broken falls back to the default.
export function getCustomStyle(): CustomStyle {
  let raw: Partial<CustomStyle> = {}
  try {
    raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '{}') ?? {}
  } catch {
    raw = {}
  }
  const d = DEFAULT_CUSTOM_STYLE
  return {
    base: oneOf(raw.base, ['classic', 'modern'], d.base),
    accent: normalizeAccent(typeof raw.accent === 'string' ? raw.accent : d.accent),
    font: oneOf(raw.font, ['inter', 'poppins', 'atkinson'], d.font),
    radius: oneOf(raw.radius, ['sharp', 'medium', 'round'], d.radius),
    surfaces: oneOf(raw.surfaces, ['clay', 'lines'], d.surfaces),
    textSize: oneOf(raw.textSize, ['small', 'normal', 'large'], d.textSize),
  }
}

export function setCustomStyle(style: CustomStyle) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(style))
  } catch {
    // Not remembered; applies for now.
  }
  customVersion++
  paint()
  emit()
}

// Atkinson Hyperlegible is only fetched when someone picks it.
function ensureFont(font: CustomStyle['font']) {
  if (font !== 'atkinson' || document.getElementById('muzio-font-atkinson')) return
  const link = document.createElement('link')
  link.id = 'muzio-font-atkinson'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap'
  document.head.appendChild(link)
}

export function setStyleChoice(style: StyleChoice) {
  try {
    localStorage.setItem(STYLE_KEY, style)
  } catch {
    // Not remembered; applies for now.
  }
  paint()
  emit()
}

export function systemPrefersDark(): boolean {
  return darkQuery()?.matches ?? false
}

export function isDarkNow(choice: ThemeChoice = getThemeChoice()): boolean {
  return choice === 'dark' || (choice === 'system' && systemPrefersDark())
}

function paint() {
  const root = document.documentElement
  const dark = isDarkNow()
  root.classList.toggle('dark', dark)
  const style = getStyleChoice()
  for (const prop of CUSTOM_PROPS) root.style.removeProperty(prop)
  root.style.removeProperty('font-size')
  delete root.dataset.surfaces

  if (style === 'custom') {
    const c = getCustomStyle()
    if (c.base === 'modern') root.dataset.style = 'modern'
    else delete root.dataset.style
    root.dataset.surfaces = c.surfaces
    const shades = accentShades(c.accent, { dark, base: c.base })
    root.style.setProperty('--color-coral', shades.fill)
    root.style.setProperty('--color-coral-dark', shades.strong)
    root.style.setProperty('--color-coral-tint', shades.tint)
    ensureFont(c.font)
    root.style.setProperty('--font-heading', FONTS[c.font])
    root.style.setProperty('--font-body', FONTS[c.font])
    const [lg, xl, xxl, xxxl] = RADII[c.radius]
    root.style.setProperty('--radius-lg', lg)
    root.style.setProperty('--radius-xl', xl)
    root.style.setProperty('--radius-2xl', xxl)
    root.style.setProperty('--radius-3xl', xxxl)
    if (c.textSize !== 'normal') root.style.fontSize = TEXT_SIZES[c.textSize]
    return
  }
  if (style === 'modern') root.dataset.style = 'modern'
  else delete root.dataset.style
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, choice)
  } catch {
    // Not remembered; applies for now.
  }
  paint()
  emit()
}

// On start (App).
export function initTheme() {
  darkQuery()
  paint()
}

// The current choice, whether it's dark right now and the style, kept in sync.
// (The custom style's details: getCustomStyle, re-read on every change.)
export function useTheme(): { choice: ThemeChoice; dark: boolean; style: StyleChoice } {
  const snapshot = useSyncExternalStore(
    (listener) => {
      darkQuery()
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => `${getThemeChoice()}|${isDarkNow()}|${getStyleChoice()}|${customVersion}`,
  )
  const [choice, dark, style] = snapshot.split('|')
  return { choice: choice as ThemeChoice, dark: dark === 'true', style: style as StyleChoice }
}
