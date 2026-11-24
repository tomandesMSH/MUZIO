// "Add MUZIO to the home screen" (issue #4). Chrome / Edge / Android fire
// beforeinstallprompt once the app is installable; we keep the event so the
// Profile can show the real install dialog later. Safari (iPhone, iPad, Mac)
// never fires it - there the pupil adds the app by hand, so we explain how.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

// Call once at startup, before React renders (the event can fire early).
export function listenForInstallPrompt(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // no mini-infobar; we offer it from the Profile instead
    deferred = e as BeforeInstallPromptEvent
  })
  target.addEventListener('appinstalled', () => {
    deferred = null
  })
}

export function isRunningInstalled(target: Window = window): boolean {
  const nav = target.navigator as Navigator & { standalone?: boolean }
  return target.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
}

export function isAppleDevice(userAgent: string = navigator.userAgent): boolean {
  // iPadOS reports itself as a Mac; Safari on Mac also installs by hand.
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent) && !/Chrome|CriOS|Edg|Firefox|FxiOS/.test(userAgent)
}

export type InstallResult = 'installed' | 'dismissed' | 'apple-instructions' | 'browser-instructions'

// Opens the browser's install dialog when there is one; otherwise says which
// instructions to show.
export async function requestInstall(userAgent?: string): Promise<InstallResult> {
  if (deferred) {
    const event = deferred
    deferred = null // the event can only be used once
    await event.prompt()
    const { outcome } = await event.userChoice
    return outcome === 'accepted' ? 'installed' : 'dismissed'
  }
  return isAppleDevice(userAgent) ? 'apple-instructions' : 'browser-instructions'
}

export const INSTALL_INSTRUCTIONS: Record<'apple-instructions' | 'browser-instructions', string> = {
  'apple-instructions': 'V Safari klepni na Sdílet (čtvereček se šipkou) a vyber „Přidat na plochu“.',
  'browser-instructions': 'V menu prohlížeče (⋮) vyber „Nainstalovat aplikaci“ nebo „Přidat na plochu“.',
}
