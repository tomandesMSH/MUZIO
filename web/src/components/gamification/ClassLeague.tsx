import { Card } from '../ui/Card'
import { FlameIcon } from './Flames'
import { useQuery } from '../../lib/data/useQuery'
import { supabase } from '../../lib/supabase'
import { rankLeague, type LeagueRow } from '../../lib/league'

async function fetchLeague(classroomId: string): Promise<LeagueRow[]> {
  const { data, error } = await supabase.rpc('class_flame_league', { p_classroom: classroomId })
  if (error) throw error
  return ((data ?? []) as LeagueRow[]).map((r) => ({ ...r, days: Number(r.days) }))
}

// Žebříček třídy: flames this week (migration 0054). `top` = how many to
// show by name; the pupil's own row is added when it's further down.
export function ClassLeague({ classroomId, classroomName, top = 5 }: { classroomId: string; classroomName?: string; top?: number }) {
  const league = useQuery(() => fetchLeague(classroomId).catch(() => null), [classroomId])
  if (!league.data || league.data.length < 2) return null
  const { shown, withoutFlames } = rankLeague(league.data, top)

  return (
    <Card>
      <h2 className="text-sm font-heading font-semibold mb-2">
        Žebříček třídy{classroomName ? ` · ${classroomName}` : ''}
        <span className="font-body font-normal text-xs text-text-muted"> (plamínky tento týden)</span>
      </h2>
      {shown.length === 0 ? (
        <p className="text-sm text-text-muted">Tento týden zatím nikdo nemá plamínek.</p>
      ) : (
        <ol className="space-y-1">
          {shown.map((r) => (
            <li
              key={`${r.short_name}-${r.place}-${r.is_me}`}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${r.is_me ? 'bg-coral-tint text-coral-dark font-semibold' : ''}`}
            >
              <span className="w-6 text-right text-text-muted">{r.place}.</span>
              <span className="flex-1 truncate">{r.is_me ? `${r.short_name} (ty)` : r.short_name}</span>
              <span className="flex items-center gap-0.5">
                {r.days}
                <FlameIcon lit className="h-4 w-4" />
              </span>
            </li>
          ))}
        </ol>
      )}
      {withoutFlames > 0 && shown.length > 0 && (
        <p className="mt-1.5 text-[11px] text-text-muted">Bez plamínku tento týden: {withoutFlames}</p>
      )}
    </Card>
  )
}
