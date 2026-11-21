import { useState } from 'react'
import { Chevron, Collapse } from '../ui/Collapse'
import { useQuery } from '../../lib/data/useQuery'
import { supabase } from '../../lib/supabase'
import { flamesLabel } from '../../lib/flames'

export interface Base44Row {
  base44_name: string | null
  flames: number
  stars: number
  badges: number
  claimed: boolean
  muzio_name: string | null
  claimed_at: string | null
}

async function fetchOverview(): Promise<Base44Row[]> {
  const { data, error } = await supabase.rpc('base44_migration_overview')
  if (error) throw error
  return (data ?? []) as Base44Row[]
}

// Who of the Base44 pupils has moved their data to Muzio (migration 0056),
// the ones still missing on top. Nothing shows without the migration or data.
export function Base44Overview({ rows: given }: { rows?: Base44Row[] }) {
  const loaded = useQuery(() => (given ? Promise.resolve(given) : fetchOverview().catch(() => [])), [given])
  const [open, setOpen] = useState(false)
  const rows = loaded.data ?? []
  if (rows.length === 0) return null
  const done = rows.filter((r) => r.claimed).length

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 p-3.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm">
          <span className="font-heading font-semibold">Migrace z Base44</span>
          <span className="text-text-muted">
            {' '}
            · převzato {done} z {rows.length}
          </span>
        </span>
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        <ul className="divide-y divide-border px-3.5 pb-3 text-sm">
          {rows.map((r, i) => (
            <li key={`${r.base44_name}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
              <span className={r.claimed ? '' : 'font-semibold'}>
                {r.base44_name ?? 'Bez jména'}
                {r.claimed && r.muzio_name && <span className="text-text-muted font-normal"> → {r.muzio_name}</span>}
              </span>
              <span className="text-xs text-text-muted">
                {flamesLabel(r.flames)}, hvězdy {r.stars}
                {r.badges > 0 && `, odznaky ${r.badges}`} ·{' '}
                {r.claimed
                  ? `převzato${r.claimed_at ? ` ${new Date(r.claimed_at).toLocaleDateString('cs-CZ')}` : ''}`
                  : 'zatím nepřevzato'}
              </span>
            </li>
          ))}
        </ul>
        <p className="px-3.5 pb-3.5 text-[11px] text-text-muted">
          Žák převezme data na přihlašovací obrazovce v záložce Migrace e-mailem z předchozí aplikace.
        </p>
      </Collapse>
    </div>
  )
}
