import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { useQuery } from '../../lib/data/useQuery'
import { fetchBugReports, setBugReportStatus } from '../../lib/data/bugReports'
import { getErrorMessage } from '../../lib/errors'

// Admin -> Chyby: what testers reported with "Nahlásit chybu" (migration 0050).
export function BugReportsSection({ onChanged }: { onChanged?: () => void }) {
  const reports = useQuery(() => fetchBugReports(), [])
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()

  async function toggle(id: string, resolved: boolean) {
    setBusy(id)
    setError(undefined)
    try {
      await setBugReportStatus(id, resolved ? 'open' : 'resolved')
      reports.refetch()
      onChanged?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Změna se nepovedla.'))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="space-y-3">
      {reports.loading && !reports.data && <Skeleton rows={3} height="h-20" />}
      {reports.error && (
        <p className="text-sm text-coral-dark">Načtení se nepovedlo: {reports.error.message}. Je spuštěná migrace 0050?</p>
      )}
      {error && <p className="text-sm text-coral-dark">{error}</p>}
      {reports.data?.length === 0 && <p className="text-text-muted text-sm">Zatím nikdo nic nenahlásil.</p>}
      {reports.data?.map((r) => {
        const resolved = r.status === 'resolved'
        return (
          <div key={r.id} className={`rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-2 ${resolved ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
              <span>
                {new Date(r.created_at).toLocaleString('cs-CZ')} · {r.reporter_name ?? 'Smazaný účet'}
              </span>
              <span>verze {r.app_version?.slice(0, 7) ?? '?'}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">{r.body}</p>
            <p className="text-[11px] text-text-muted break-all">
              {r.path}
              {r.user_agent && ` · ${r.user_agent}`}
            </p>
            <Button variant="ghost" className="!py-1.5 text-xs" disabled={busy === r.id} onClick={() => toggle(r.id, resolved)}>
              {resolved ? 'Znovu otevřít' : 'Vyřešeno'}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
