import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { PasswordReauthModal } from '../../components/ui/PasswordReauthModal'
import {
  defaultCleanupDate,
  fetchCleanupCandidates,
  fetchPendingNoticeCleanup,
  tomorrowKey,
  runCleanup,
  type CleanupCandidate,
} from '../../lib/data/adminCleanup'
import { formatBytes } from '../../lib/data/adminUsage'
import { isReauthed } from '../../lib/reauth'
import { getErrorMessage } from '../../lib/errors'
import { useQuery } from '../../lib/data/useQuery'

// "Úklid starých nahrávek" under Využití (migration 0034).
export function CleanupSection({ onCleaned }: { onCleaned: () => void }) {
  const [before, setBefore] = useState(() => defaultCleanupDate())
  const [candidates, setCandidates] = useState<CleanupCandidate[]>()
  const [searching, setSearching] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  // The files from the automatic warning (0047), loaded with "Načíst".
  const pending = useQuery(() => fetchPendingNoticeCleanup().catch(() => null), [])
  const [fromNotice, setFromNotice] = useState(false)

  const totalBytes = (candidates ?? []).reduce((sum, c) => sum + c.bytes, 0)
  const dateLabel = new Date(before).toLocaleDateString('cs-CZ')

  function loadNotice() {
    if (!pending.data) return
    setCandidates(pending.data.candidates)
    setBefore(tomorrowKey())
    setFromNotice(true)
    setResult(undefined)
    setError(undefined)
  }

  async function search() {
    setSearching(true)
    setError(undefined)
    setResult(undefined)
    setFromNotice(false)
    try {
      setCandidates(await fetchCleanupCandidates(before))
    } catch (err) {
      setError(getErrorMessage(err, 'Hledání se nepovedlo. Je spuštěná migrace 0034?'))
    } finally {
      setSearching(false)
    }
  }

  function requestCleanup() {
    setConfirmOpen(true)
    if (!isReauthed()) setReauthOpen(true)
  }

  async function cleanup() {
    if (!candidates) return
    setConfirmOpen(false)
    setRunning(true)
    setProgress(0)
    setError(undefined)
    try {
      const cleared = await runCleanup(candidates, before, setProgress)
      setResult(`Hotovo: uklizeno ${cleared} nahrávek, uvolněno asi ${formatBytes(totalBytes)}.`)
      setCandidates(undefined)
      setFromNotice(false)
      setBefore(defaultCleanupDate())
      pending.refetch()
      onCleaned()
    } catch (err) {
      setError(getErrorMessage(err, 'Úklid se nepovedl celý, zkus ho spustit znovu. Pokračuje, kde skončil.'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
      <PasswordReauthModal
        open={reauthOpen}
        onCancel={() => {
          setReauthOpen(false)
          setConfirmOpen(false)
        }}
        onSuccess={() => setReauthOpen(false)}
      />
      <ConfirmDialog
        open={!reauthOpen && confirmOpen}
        title="Smazat zvuk starých nahrávek?"
        message={`Smaže se zvuk ${candidates?.length ?? 0} ohodnocených nahrávek ${
          fromNotice ? 'z upozornění na plné úložiště' : `starších než ${dateLabel}`
        } (asi ${formatBytes(totalBytes)}). Hodnocení, komentáře, obrázky, XP a odznaky zůstanou, jen už nepůjdou přehrát. Nejde to vrátit.`}
        confirmLabel="Smazat zvuk"
        onConfirm={cleanup}
        onCancel={() => setConfirmOpen(false)}
      />

      <div>
        <h2 className="font-heading font-semibold text-sm">Úklid starých nahrávek</h2>
        <p className="text-xs text-text-muted">
          Uvolní místo v úložišti: smaže zvuk ohodnocených nahrávek starších než zvolené datum. Hodnocení, XP a odznaky
          zůstanou. Neohodnocené nahrávky se nemažou.
        </p>
      </div>
      {pending.data && (
        <div className="rounded-xl bg-coral-tint text-coral-dark p-3 text-xs space-y-1.5">
          <p>
            Úložiště bylo skoro plné, a tak dostali majitelé {pending.data.candidates.length} největších nahrávek (asi{' '}
            {formatBytes(pending.data.candidates.reduce((sum, c) => sum + c.bytes, 0))}) upozornění, že se smažou od{' '}
            {new Date(pending.data.deleteAfter).toLocaleDateString('cs-CZ')}.
          </p>
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={running} onClick={loadNotice}>
            Načíst nahrávky z upozornění
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <div className="text-xs font-semibold text-text-muted mb-1">Starší než</div>
          <Input
            type="date"
            value={before}
            onChange={(e) => {
              setBefore(e.target.value)
              setCandidates(undefined)
              setFromNotice(false)
            }}
            className="!w-auto"
          />
        </label>
        <Button variant="ghost" disabled={searching || running || !before} onClick={search}>
          Najít
        </Button>
      </div>

      {candidates && candidates.length === 0 && (
        <p className="text-sm text-text-muted">Nic k úklidu, žádné ohodnocené nahrávky starší než {dateLabel}.</p>
      )}
      {candidates && candidates.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <strong>{candidates.length}</strong> nahrávek, asi <strong>{formatBytes(totalBytes)}</strong>
          </p>
          <Button variant="destructive" disabled={running} onClick={requestCleanup}>
            Smazat zvuk
          </Button>
        </div>
      )}
      {running && candidates && (
        <p className="text-sm text-text-muted" role="status">
          Uklízím… {progress} / {candidates.length}
        </p>
      )}
      {result && (
        <p className="text-sm" role="status">
          {result}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}
    </div>
  )
}
