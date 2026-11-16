import { useState } from 'react'
import { InfoTip } from '../ui/InfoTip'
import { fetchAttachmentDownloadUrl } from '../../lib/data/classrooms'
import { KEYBOARD_UTILS_DOWNLOAD_URL, keyboardUtilsOpenLink } from '../../lib/attachments'
import { getErrorMessage } from '../../lib/errors'
import type { Assignment } from '../../lib/data/types'

interface AttachmentLinkProps {
  assignment: Pick<Assignment, 'attachment_path' | 'attachment_name'>
  // The teacher sees a shorter explanation - they attached it themselves.
  forTeacher?: boolean
}

const actionButton =
  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-heading font-semibold transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none'

// The assignment's score: its name with an "i" explaining what to do with it,
// and two buttons under it - download, or open straight in Keyboard Utils.
export function AttachmentLink({ assignment, forTeacher = false }: AttachmentLinkProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  if (!assignment.attachment_path) return null

  const fileName = assignment.attachment_name ?? assignment.attachment_path.split('/').pop() ?? 'noty.mid'

  async function go(target: (signedUrl: string) => string, failed: string) {
    setBusy(true)
    setError(undefined)
    try {
      // Either a signed link that downloads (Content-Disposition: attachment),
      // or the keyboardutils:// link handing it to the app - the page stays
      // where it is.
      window.location.assign(target(await fetchAttachmentDownloadUrl(assignment)))
    } catch (err) {
      setError(getErrorMessage(err, failed))
    } finally {
      setBusy(false)
    }
  }

  const download = () => go((url) => url, 'Stažení se nepovedlo.')
  const openInApp = () => go((url) => keyboardUtilsOpenLink(url, fileName), 'Otevření se nepovedlo.')

  return (
    <div className="text-xs space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <span aria-hidden="true">🎼</span>
        <span className="truncate font-semibold text-text-primary" title={fileName}>
          {assignment.attachment_name ?? 'Noty k úkolu'}
        </span>
        <InfoTip label="Co s tímhle souborem">
          {forTeacher ? (
            <span className="block">
              Noty, které jsi k úkolu přiložil(a). Žáci si je stáhnou a procvičí v aplikaci Keyboard Utils.
            </span>
          ) : (
            <>
              <span className="block mb-1.5">
                Učitel ti k úkolu přiložil noty skladby. Procvičíš je v aplikaci <b>Keyboard Utils</b> (zdarma pro
                Windows).
              </span>
              <span className="block mb-1.5">
                Máš ji? Tlačítko <b>Otevřít v Keyboard Utils</b> ji spustí rovnou s touhle skladbou (prohlížeč se
                napoprvé zeptá, jestli ji smí otevřít). Když se nic nestane, stáhni si appku nebo soubor a otevři ho
                v ní ručně.
              </span>
              <span className="block mb-1.5">
                Uvidíš skladbu jako padající noty i v notách, můžeš si ji zpomalit, opakovat těžká místa a zkusit si ji
                zahrát v režimu učení - appka ti ukáže, co jsi trefil(a). Až ji budeš umět, nahraj úkol tady jako
                obvykle.
              </span>
              <a
                className="underline font-semibold"
                href={KEYBOARD_UTILS_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Stáhnout Keyboard Utils
              </a>
            </>
          )}
        </InfoTip>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${actionButton} border-border text-text-primary hover:bg-bg-card-alt`}
          disabled={busy}
          onClick={download}
          aria-label={`Stáhnout ${fileName}`}
        >
          <span aria-hidden="true">⬇</span> Stáhnout
        </button>
        <button
          type="button"
          className={`${actionButton} border-coral/40 text-coral-dark hover:bg-coral/10`}
          disabled={busy}
          onClick={openInApp}
        >
          <span aria-hidden="true">🎹</span> Otevřít v Keyboard Utils
        </button>
      </div>
      {error && <p className="text-coral-dark">{error}</p>}
    </div>
  )
}
