import { useQuery } from '../../lib/data/useQuery'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  BUCKET_NAMES,
  FREE_DATABASE_BYTES,
  FREE_STORAGE_BYTES,
  fetchUsage,
  formatBytes,
  usageLevel,
} from '../../lib/data/adminUsage'
import { CleanupSection } from './CleanupSection'

const TONE_BAR = { ok: 'bg-coral', warn: 'bg-[#e0a100]', full: 'bg-coral-dark' } as const

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const { share, tone } = usageLevel(used, limit)
  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-heading font-semibold text-sm">{label}</span>
        <span className="text-sm">
          <strong>{formatBytes(used)}</strong> <span className="text-text-muted">z {formatBytes(limit)}</span>
        </span>
      </div>
      <div
        className="h-2.5 rounded-full bg-bg-card-alt shadow-clay-press overflow-hidden"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div className={`h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
      </div>
      <div className="text-xs text-text-muted">
        {Math.round(share * 100)} %
        {tone === 'warn' && ' – blíží se limitu free tieru'}
        {tone === 'full' && ' – skoro plno: uklid staré nahrávky nebo přejdi na Pro'}
      </div>
    </div>
  )
}

// Supabase usage against the free plan (migration 0032).
export function UsageSection() {
  const usage = useQuery(() => fetchUsage(), [])
  const u = usage.data
  const storageBytes = (u?.buckets ?? []).reduce((sum, b) => sum + b.bytes, 0)

  return (
    <div className="space-y-3">
      {usage.loading && !usage.data && <Skeleton rows={2} height="h-24" />}
      {usage.error && (
        <p className="text-sm text-coral-dark">Načtení se nepovedlo: {usage.error.message}. Je spuštěná migrace 0032?</p>
      )}
      {u && (
        <>
          <Meter label="Úložiště souborů" used={storageBytes} limit={FREE_STORAGE_BYTES} />
          <Meter label="Databáze" used={u.database_bytes} limit={FREE_DATABASE_BYTES} />

          <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4">
            <h2 className="font-heading font-semibold text-sm mb-2">Co zabírá úložiště</h2>
            <table className="w-full text-sm">
              <tbody>
                {u.buckets.map((b) => (
                  <tr key={b.bucket} className="border-b border-border last:border-none">
                    <td className="py-1.5">{BUCKET_NAMES[b.bucket] ?? b.bucket}</td>
                    <td className="py-1.5 text-right text-text-muted">{b.files} souborů</td>
                    <td className="py-1.5 text-right font-semibold">{formatBytes(b.bytes)}</td>
                  </tr>
                ))}
                {u.buckets.length === 0 && (
                  <tr>
                    <td className="text-text-muted text-xs">Úložiště je prázdné.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {u.top_pupils.length > 0 && (
            <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4">
              <h2 className="font-heading font-semibold text-sm mb-2">Žáci s největšími nahrávkami</h2>
              <table className="w-full text-sm">
                <tbody>
                  {u.top_pupils.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-none">
                      <td className="py-1.5 truncate">{p.name ?? 'Smazaný účet'}</td>
                      <td className="py-1.5 text-right text-text-muted">{p.files} nahrávek</td>
                      <td className="py-1.5 text-right font-semibold">{formatBytes(p.bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <CleanupSection onCleaned={usage.refetch} />

          <p className="text-xs text-text-muted">
            {u.counts.students} žáků · {u.counts.teachers} učitelů · {u.counts.recordings} nahrávek. Limity jsou z free
            tieru Supabase; přenos dat (egress, 5 GB měsíčně) ukazuje jen dashboard Supabase → Usage.
          </p>
        </>
      )}
    </div>
  )
}
