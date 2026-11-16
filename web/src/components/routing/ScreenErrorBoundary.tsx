import { Component, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import { isChunkLoadError } from '../../lib/chunkError'

// A screen is downloaded when first opened (router.tsx). That fails when the
// phone is offline, or when a new Muzio was deployed meanwhile and the old
// file is gone. Online: reload once to get the new version. Offline: say so.
const RELOAD_KEY = 'muzio-chunk-reload'

interface State {
  error?: unknown
}

export class ScreenErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {}

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown) {
    if (!isChunkLoadError(error) || !navigator.onLine) return
    try {
      // Once per minute at most, so a real outage doesn't reload forever.
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
      if (Date.now() - last < 60_000) return
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      // No storage: still try once.
    }
    window.location.reload()
  }

  render() {
    if (this.state.error === undefined) return this.props.children
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return (
      <div className="mx-auto max-w-sm p-6 pt-16 text-center space-y-3">
        <div className="text-3xl" aria-hidden>
          {offline ? '📡' : '🔄'}
        </div>
        <h1 className="text-lg font-heading font-semibold">
          {offline ? 'Tuhle stránku teď nejde otevřít' : 'Něco se nepovedlo načíst'}
        </h1>
        <p className="text-sm text-text-muted">
          {offline
            ? 'Jsi offline a tahle část Muzia ještě není uložená v zařízení. Zkus to, až budeš online.'
            : 'Zkus stránku načíst znovu.'}
        </p>
        <Button onClick={() => window.location.reload()}>Načíst znovu</Button>
      </div>
    )
  }
}
