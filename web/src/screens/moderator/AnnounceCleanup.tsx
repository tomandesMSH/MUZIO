import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { announceCleanup, fetchOpenCleanupNotices, noticeDay } from '../../lib/data/cleanupNotices'
import { useQuery } from '../../lib/data/useQuery'
import { getErrorMessage } from '../../lib/errors'

// "Oznámit čištění": every pupil gets a notification and a banner that old
// recordings will be cleared in 7 days, so they can save what they care
// about. The clearing itself stays in Úklid starých nahrávek below.
export function AnnounceCleanup() {
  const [today] = useState(() => new Date())
  const open = useQuery(() => fetchOpenCleanupNotices(today).catch(() => []), [])
  const current = open.data?.find((n) => n.kind === 'all')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>()

  async function announce() {
    setConfirming(false)
    setBusy(true)
    setResult(undefined)
    try {
      await announceCleanup()
      setResult('Oznámeno. Žáci dostali notifikaci a uvidí upozornění na nástěnce.')
      open.refetch()
    } catch (err) {
      setResult(getErrorMessage(err, 'Oznámení se nepovedlo. Je spuštěná migrace 0046?'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-2">
      <h2 className="font-heading font-semibold text-sm">Oznámit čištění</h2>
      <p className="text-xs text-text-muted">
        Pošle všem žákům notifikaci, že se do 7 dní budou mazat nahrávky, ať si uloží ty, na kterých jim záleží. Na
        nástěnce uvidí upozornění s odkazem na své nahrávky. Samotné mazání pak spustíš v úklidu níže.
      </p>
      {current && (
        <p className="text-xs">
          Oznámeno, mazat se smí od <strong>{noticeDay(current.delete_after)}</strong>.
        </p>
      )}
      <Button variant="secondary" disabled={busy} onClick={() => setConfirming(true)}>
        {busy ? 'Oznamuji…' : 'Oznámit čištění'}
      </Button>
      {result && <p className="text-xs">{result}</p>}
      <ConfirmDialog
        open={confirming}
        title="Oznámit čištění všem žákům?"
        message="Každý žák dostane notifikaci, že se do 7 dní budou mazat nahrávky."
        confirmLabel="Oznámit"
        onConfirm={announce}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
