// Light / dark / as the phone or computer has it ("Podle systému", the
// default). The choice is kept in this browser; the dark class goes on <html>.
import { useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

// A new key: the old one ('muzio-theme') was written as 'light' for everyone
// on every start, so it can't tell a real choice from the old default.
const CHOICE_KEY = 'muzio-theme-choice'
const OLD_KEY = 'muzio-theme'

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

export function systemPrefersDark(): boolean {
  return darkQuery()?.matches ?? false
}

export function isDarkNow(choice: ThemeChoice = getThemeChoice()): boolean {
  return choice === 'dark' || (choice === 'system' && systemPrefersDark())
}

function paint() {
  document.documentElement.classList.toggle('dark', isDarkNow())
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

// The current choice and whether it's dark right now, kept in sync.
export function useTheme(): { choice: ThemeChoice; dark: boolean } {
  const snapshot = useSyncExternalStore(
    (listener) => {
      darkQuery()
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => `${getThemeChoice()}|${isDarkNow()}`,
  )
  const [choice, dark] = snapshot.split('|')
  return { choice: choice as ThemeChoice, dark: dark === 'true' }
}
