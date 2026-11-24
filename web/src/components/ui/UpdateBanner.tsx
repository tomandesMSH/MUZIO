import { useEffect, useState } from 'react'
import { CHECK_EVERY_MS, fetchDeployedVersion, isNewVersion } from '../../lib/appVersion'
import { onAppResume } from '../../lib/appResume'

// "Nová verze MUZIA je připravená - Obnovit": checks on coming back to the app
// and every 10 minutes. Above the bottom bar on a phone.
export function UpdateBanner({ running = __APP_VERSION__ }: { running?: string }) {
  const [available, setAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (running === 'dev') return
    let stopped = false
    const check = async () => {
      if (isNewVersion(running, await fetchDeployedVersion()) && !stopped) setAvailable(true)
    }
    const timer = setInterval(() => void check(), CHECK_EVERY_MS)
    const unsubscribe = onAppResume(() => void check())
    return () => {
      stopped = true
      clearInterval(timer)
      unsubscribe()
    }
  }, [running])

  if (!available || dismissed) return null
  return (
    <div
      role="status"
      className="fixed left-4 right-4 bottom-24 md:bottom-6 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-cream shadow-xl"
    >
      <span className="flex-1">Nová verze MUZIA je připravená.</span>
      <button className="font-heading font-semibold text-coral" onClick={() => window.location.reload()}>
        Obnovit
      </button>
      <button aria-label="Později" className="text-cream/60 hover:text-cream" onClick={() => setDismissed(true)}>
        ✕
      </button>
    </div>
  )
}
