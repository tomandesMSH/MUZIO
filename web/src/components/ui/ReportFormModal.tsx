import { useEffect, useState } from 'react'
import { reportFormUrl } from '../../lib/report'

// "Nahlásit problém nebo nápad" in a window over the app, instead of a new
// tab: the form from tomandes.eu in a frame (its embed mode, without the site
// around it). "Otevřít v novém okně" is there in case the frame won't load.
export function ReportFormModal({ pupil, onClose }: { pupil?: boolean; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nahlásit problém nebo nápad"
        className="flex h-[min(88dvh,820px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-heading font-semibold text-base">Nahlásit problém nebo nápad</h2>
          <div className="flex items-center gap-3">
            <a
              href={reportFormUrl({ pupil })}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
            >
              Otevřít v novém okně
            </a>
            <button
              type="button"
              aria-label="Zavřít"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-card-alt text-text-muted hover:text-text-primary"
            >
              ✕
            </button>
          </div>
        </div>
        {/* The form's own dark background, so there's no white flash while it loads. */}
        <div className="relative flex-1 bg-[#080b14]">
          {!loaded && (
            <p className="absolute inset-x-0 top-8 text-center text-sm text-white/60">Načítám formulář…</p>
          )}
          <iframe
            title="Formulář pro nahlášení"
            src={reportFormUrl({ pupil, embed: true })}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  )
}
