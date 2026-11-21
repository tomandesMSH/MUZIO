import { beforeEach, describe, expect, it, vi } from 'vitest'

let systemDark = false
const changeListeners: (() => void)[] = []
window.matchMedia = vi.fn(() => ({
  get matches() {
    return systemDark
  },
  addEventListener: (_: string, fn: () => void) => changeListeners.push(fn),
})) as unknown as typeof window.matchMedia

const { DEFAULT_CUSTOM_STYLE, getCustomStyle, getStyleChoice, getThemeChoice, initTheme, isDarkNow, setCustomStyle, setStyleChoice, setThemeChoice } =
  await import('./theme')
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

  it('custom sets its variables on <html>, and Classic clears them', () => {
    const root = document.documentElement
    setCustomStyle({ ...DEFAULT_CUSTOM_STYLE, base: 'modern', accent: '#2f6fdb', font: 'inter', radius: 'sharp', surfaces: 'lines', textSize: 'large' })
    setStyleChoice('custom')
    expect(root.dataset.style).toBe('modern')
    expect(root.dataset.surfaces).toBe('lines')
    expect(root.style.getPropertyValue('--color-coral')).toBe('#2f6fdb')
    expect(root.style.getPropertyValue('--font-body')).toContain('Inter')
    expect(root.style.getPropertyValue('--radius-2xl')).toBe('8px')
    expect(root.style.fontSize).toBe('112.5%')
    setStyleChoice('classic')
    expect(root.dataset.style).toBeUndefined()
    expect(root.dataset.surfaces).toBeUndefined()
    expect(root.style.getPropertyValue('--color-coral')).toBe('')
    expect(root.style.fontSize).toBe('')
  })

  it('a broken saved custom style falls back to the defaults', () => {
    localStorage.setItem('muzio-custom-style', '{"accent":"nope","font":"comic","radius":"round"}')
    expect(getCustomStyle()).toEqual({ ...DEFAULT_CUSTOM_STYLE, radius: 'round' })
    localStorage.setItem('muzio-custom-style', 'not json')
    expect(getCustomStyle()).toEqual(DEFAULT_CUSTOM_STYLE)
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
