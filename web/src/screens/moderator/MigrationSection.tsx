import { Skeleton } from '../../components/ui/Skeleton'
import { useQuery } from '../../lib/data/useQuery'
import { fetchBase44Overview } from '../../components/teacher/Base44Overview'
import { flamesLabel } from '../../lib/flames'

// Admin -> Migrace: every pupil from the Base44 app and whether they have
// moved their data to MUZIO yet (migrations 0055, 0056).
export function MigrationSection() {
  const rows = useQuery(() => fetchBase44Overview(), [])
  const list = rows.data ?? []
  const done = list.filter((r) => r.claimed).length

  return (
    <div className="space-y-3">
      {rows.loading && !rows.data && <Skeleton rows={4} height="h-12" />}
      {rows.error && (
        <p className="text-sm text-coral-dark">
          Načtení se nepovedlo: {rows.error.message}. Jsou spuštěné migrace 0055 a 0056?
        </p>
      )}
      {rows.data && list.length === 0 && (
        <p className="text-sm text-text-muted">V datech z Base44 zatím nikdo není. Spusť import base44_import.sql.</p>
      )}
      {list.length > 0 && (
        <>
          <p className="text-sm">
            Převzato <strong>{done}</strong> z <strong>{list.length}</strong> žáků z Base44.
          </p>
          <div className="rounded-2xl bg-bg-card shadow-clay-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border">
                  <th className="py-2 px-3 font-semibold">Žák v Base44</th>
                  <th className="py-2 px-3 font-semibold">Stav</th>
                  <th className="py-2 px-3 font-semibold">Účet v MUZIU</th>
                  <th className="py-2 px-3 font-semibold text-right">Plamínky</th>
                  <th className="py-2 px-3 font-semibold text-right">Hvězdy</th>
                  <th className="py-2 px-3 font-semibold text-right">Odznaky</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={`${r.base44_name}-${i}`} className="border-b border-border last:border-none">
                    <td className="py-2 px-3">{r.base44_name ?? 'Bez jména'}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.claimed ? (
                        <span className="text-text-primary">
                          Migroval(a)
                          {r.claimed_at && (
                            <span className="text-text-muted"> {new Date(r.claimed_at).toLocaleDateString('cs-CZ')}</span>
                          )}
                        </span>
                      ) : (
                        <span className="font-semibold text-coral-dark">Nemigroval(a)</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-text-muted">{r.muzio_name ?? '–'}</td>
                    <td className="py-2 px-3 text-right tabular-nums" title={flamesLabel(r.flames)}>
                      {r.flames}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{r.stars}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{r.badges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
