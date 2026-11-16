import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchReviewContext } from '../../lib/data/classrooms'
import { fetchLogsForExport } from '../../lib/data/practiceLogs'
import { change, classOverview, weekStarts, type ClassOverview } from '../../lib/weeklyOverview'

const TONE = { up: 'text-green-600 dark:text-green-400', down: 'text-coral-dark', same: 'text-text-muted' }

async function load(teacherId: string, now: Date): Promise<ClassOverview[]> {
  const { classrooms, membersOf } = await fetchReviewContext(teacherId, [])
  const pupils = [...new Set([...membersOf.values()].flatMap((s) => [...s]))]
  if (pupils.length === 0) return []
  const { lastWeek } = weekStarts(now)
  const logs = await fetchLogsForExport(pupils, lastWeek.toISOString(), new Date(now.getTime() + 60_000).toISOString())
  return classOverview(
    classrooms,
    membersOf,
    logs.map((l) => ({
      user_id: l.user_id,
      created_at: l.created_at,
      duration_seconds: l.duration_seconds ?? null,
      assignment_id: l.assignment_id ?? null,
    })),
    now,
  )
}

function Change({ now, before }: { now: number; before: number }) {
  const c = change(now, before)
  return (
    <span className={`text-[11px] font-semibold ${TONE[c.tone]}`} title="Proti minulému týdnu">
      {c.text}
    </span>
  )
}

// Teacher's Dashboard: this week in each class against last week.
export function WeeklyOverview() {
  const { profile } = useAuth()
  const rows = useQuery(() => (profile ? load(profile.id, new Date()) : Promise.resolve([])), [profile?.id])
  if (!rows.data || rows.data.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">Tento týden</h2>
      <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {rows.data.map((row) => {
          const share = row.pupils ? row.thisWeek.practised / row.pupils : 0
          return (
            <li key={row.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading font-semibold text-sm truncate">{row.name}</span>
                <span className="text-xs text-text-muted shrink-0">
                  cvičilo <b className="text-text-primary">{row.thisWeek.practised}</b> z {row.pupils}{' '}
                  <Change now={row.thisWeek.practised} before={row.lastWeek.practised} />
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-bg-card-alt overflow-hidden"
                role="img"
                aria-label={`Cvičilo ${row.thisWeek.practised} z ${row.pupils} žáků`}
              >
                <div className="h-full rounded-full bg-coral transition-[width]" style={{ width: `${share * 100}%` }} />
              </div>
              <div className="flex gap-4 text-xs text-text-muted">
                <span>
                  <b className="text-text-primary">{row.thisWeek.minutes}</b> min{' '}
                  <Change now={row.thisWeek.minutes} before={row.lastWeek.minutes} />
                </span>
                <span>
                  <b className="text-text-primary">{row.thisWeek.submitted}</b> nahrávek k úkolům{' '}
                  <Change now={row.thisWeek.submitted} before={row.lastWeek.submitted} />
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-1.5 text-[11px] text-text-muted">
        Od pondělí, ↑↓ proti minulému týdnu. Počítá nahrávky, které vidíš (samostatné cvičení jen u žáků, kteří ho sdílí).
      </p>
    </div>
  )
}
