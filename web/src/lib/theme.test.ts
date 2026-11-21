import { beforeEach, describe, expect, it, vi } from 'vitest'

let systemDark = false
const changeListeners: (() => void)[] = []
window.matchMedia = vi.fn(() => ({
  get matches() {
    return systemDark
  },
  addEventListener: (_: string, fn: () => void) => changeListeners.push(fn),
})) as unknown as typeof window.matchMedia

const { getStyleChoice, getThemeChoice, initTheme, isDarkNow, setStyleChoice, setThemeChoice } = await import('./theme')
const isDarkClass = () => document.documentElement.classList.contains('dark')

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    systemDark = false
    document.documentElement.classList.remove('dark')
  })

  it('follows the system by default, also when it changes', () => {
    systemDark = true
    initTheme()
    expect(getThemeChoice()).toBe('system')
    expect(isDarkClass()).toBe(true)
    systemDark = false
    changeListeners.forEach((fn) => fn())
    expect(isDarkClass()).toBe(false)
  })

  it('classic by default; modern marks <html> and is remembered, with either theme', () => {
    initTheme()
    expect(getStyleChoice()).toBe('classic')
    expect(document.documentElement.dataset.style).toBeUndefined()
    setStyleChoice('modern')
    setThemeChoice('dark')
    expect(document.documentElement.dataset.style).toBe('modern')
    expect(isDarkClass()).toBe(true)
    expect(localStorage.getItem('muzio-style')).toBe('modern')
    setStyleChoice('classic')
    expect(document.documentElement.dataset.style).toBeUndefined()
  })

  it('an explicit choice wins over the system', () => {
    systemDark = true
    setThemeChoice('light')
    expect(isDarkClass()).toBe(false)
    changeListeners.forEach((fn) => fn())
    expect(isDarkClass()).toBe(false)
    setThemeChoice('dark')
    expect(isDarkNow()).toBe(true)
  })

  it('an old "dark" setting is kept, the old forced "light" means system', () => {
    localStorage.setItem('muzio-theme', 'dark')
    expect(getThemeChoice()).toBe('dark')
    localStorage.setItem('muzio-theme', 'light')
    expect(getThemeChoice()).toBe('system')
  })
})
