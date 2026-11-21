import { useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { SearchBar } from '../../components/ui/SearchBar'
import { useQuery } from '../../lib/data/useQuery'
import { describeAction, fetchAdminActions } from '../../lib/data/adminHistory'

// Who did what to which account, newest first (migration 0027).
export function HistorySection() {
  const history = useQuery(() => fetchAdminActions(), [])
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const visible = (history.data ?? []).filter(
    (e) =>
      !query ||
      (e.actor_name ?? '').toLowerCase().includes(query) ||
      (e.target_name ?? '').toLowerCase().includes(query) ||
      describeAction(e).toLowerCase().includes(query),
  )

  return (
    <div className="space-y-3">
      <SearchBar value={search} onChange={setSearch} placeholder="Hledat podle jména nebo akce" />
      {history.loading && !history.data && <Skeleton rows={4} height="h-12" />}
      {history.error && (
        <p className="text-sm text-coral-dark">
          Načtení se nepovedlo: {history.error.message}. Je spuštěná migrace 0027?
        </p>
      )}
      {history.data?.length === 0 && <p className="text-text-muted text-sm">Zatím žádné admin akce.</p>}
      <ul className="space-y-2">
        {visible.map((entry) => (
          <li key={entry.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-3 text-sm">
            <div className="text-xs text-text-muted">{new Date(entry.created_at).toLocaleString('cs-CZ')}</div>
            <div>
              <span className="font-heading font-semibold">{entry.actor_name ?? 'Smazaný účet'}</span>{' '}
              {describeAction(entry)}
              {entry.target_user_id || entry.target_name ? (
                <>
                  {' → '}
                  <span className="font-heading font-semibold">{entry.target_name ?? 'smazaný účet'}</span>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {(history.data?.length ?? 0) >= 200 && (
        <p className="text-xs text-text-muted">Zobrazeno posledních 200 akcí.</p>
      )}
    </div>
  )
}
