import { useSyncExternalStore } from 'react'

function subscribe(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

// A thin strip at the top while there's no connection. Recordings made
// meanwhile are kept on the device (lib/pendingUploads.ts).
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-ink px-4 py-1.5 text-center text-xs text-cream"
      style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}
    >
      Jsi offline. Nahrávky se uloží v zařízení a pošleš je, až budeš online.
    </div>
  )
}
