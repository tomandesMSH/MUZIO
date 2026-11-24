import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useAuth } from '../../lib/AuthProvider'
import { BUG_REPORT_MAX, sendBugReport } from '../../lib/data/bugReports'
import { getErrorMessage } from '../../lib/errors'

// "Nahlásit chybu": a short text; the version, page and browser go along.
export function BugReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()

  function close() {
    setBody('')
    setSent(false)
    setError(undefined)
    onClose()
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !body.trim()) return
    setSending(true)
    setError(undefined)
    try {
      await sendBugReport(profile.id, body)
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Odeslání se nepovedlo, zkus to znovu.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={close}>
      {sent ? (
        <div className="space-y-4">
          <h2 className="font-heading font-semibold text-lg">Díky za nahlášení</h2>
          <p className="text-sm text-text-muted">Podíváme se na to.</p>
          <Button className="w-full" onClick={close}>
            Zavřít
          </Button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <h2 className="font-heading font-semibold text-lg">Nahlásit chybu</h2>
          <p className="text-sm text-text-muted">
            MUZIO je v betě. Napiš, co se pokazilo a co se zrovna dělo. Verze aplikace a stránka se pošlou samy.
          </p>
          <textarea
            aria-label="Popis chyby"
            className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
            rows={5}
            maxLength={BUG_REPORT_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-sm text-coral-dark">{error}</p>}
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" className="flex-1" onClick={close}>
              Zrušit
            </Button>
            <Button type="submit" className="flex-1" disabled={sending || !body.trim()}>
              {sending ? 'Odesílám…' : 'Odeslat'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
