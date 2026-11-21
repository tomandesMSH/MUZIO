// Light / dark / as the phone or computer has it ("Podle systému", the
// default). The choice is kept in this browser; the dark class goes on <html>.
import { useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
// The look on top of light/dark: the original "clay" one, or the quieter
// modern one (data-style="modern" on <html>, see index.css).
export type StyleChoice = 'classic' | 'modern'

// A new key: the old one ('muzio-theme') was written as 'light' for everyone
// on every start, so it can't tell a real choice from the old default.
const CHOICE_KEY = 'muzio-theme-choice'
const OLD_KEY = 'muzio-theme'
const STYLE_KEY = 'muzio-style'

const listeners = new Set<() => void>()
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
    return localStorage.getItem(STYLE_KEY) === 'modern' ? 'modern' : 'classic'
  } catch {
    return 'classic'
  }
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
  root.classList.toggle('dark', isDarkNow())
  if (getStyleChoice() === 'modern') root.dataset.style = 'modern'
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
export function useTheme(): { choice: ThemeChoice; dark: boolean; style: StyleChoice } {
  const snapshot = useSyncExternalStore(
    (listener) => {
      darkQuery()
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => `${getThemeChoice()}|${isDarkNow()}|${getStyleChoice()}`,
  )
  const [choice, dark, style] = snapshot.split('|')
  return { choice: choice as ThemeChoice, dark: dark === 'true', style: style as StyleChoice }
}
