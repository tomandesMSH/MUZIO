import { describe, expect, it, vi } from 'vitest'
import { isAppleDevice, isRunningInstalled, listenForInstallPrompt, requestInstall } from './install'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/131.0 Mobile/15E148 Safari/604.1'

describe('isAppleDevice', () => {
  it('is true for Safari on an iPhone', () => expect(isAppleDevice(IPHONE)).toBe(true))
  it('is false for Chrome on Android', () => expect(isAppleDevice(ANDROID_CHROME)).toBe(false))
  it('is false for Chrome on an iPhone (it has its own menu)', () => expect(isAppleDevice(IPHONE_CHROME)).toBe(false))
})

describe('isRunningInstalled', () => {
  const fakeWindow = (standaloneMedia: boolean, iosStandalone?: boolean) =>
    ({
      matchMedia: () => ({ matches: standaloneMedia }),
      navigator: { standalone: iosStandalone },
    }) as unknown as Window

  it('detects the installed app on Android / desktop', () => expect(isRunningInstalled(fakeWindow(true))).toBe(true))
  it('detects the home-screen app on an iPhone', () => expect(isRunningInstalled(fakeWindow(false, true))).toBe(true))
  it('is false in a normal browser tab', () => expect(isRunningInstalled(fakeWindow(false, false))).toBe(false))
})

describe('requestInstall', () => {
  it('without the browser dialog, says which instructions to show', async () => {
    expect(await requestInstall(IPHONE)).toBe('apple-instructions')
    expect(await requestInstall(ANDROID_CHROME)).toBe('browser-instructions')
  })

  it('opens the saved browser dialog once and reports the choice', async () => {
    const target = new EventTarget() as unknown as Window
    listenForInstallPrompt(target)
    const prompt = vi.fn(async () => {})
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    target.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(await requestInstall(ANDROID_CHROME)).toBe('installed')
    expect(prompt).toHaveBeenCalledOnce()
    // The event is single-use: the next click falls back to instructions.
    expect(await requestInstall(ANDROID_CHROME)).toBe('browser-instructions')
  })
})
