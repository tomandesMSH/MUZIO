// "The app is back": the tab or the installed app became visible again after
// being away for a while (another app, phone locked). Screens refresh their
// data then, so a pupil coming back sees the new grade without reloading.
export const RESUME_AFTER_MS = 30_000

const listeners = new Set<() => void>()
let hiddenAt: number | undefined
let started = false

function start() {
  if (started || typeof document === 'undefined') return
  started = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
    } else if (hiddenAt !== undefined) {
      const away = Date.now() - hiddenAt
      hiddenAt = undefined
      if (away >= RESUME_AFTER_MS) for (const listener of [...listeners]) listener()
    }
  })
}

export function onAppResume(listener: () => void): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}
