import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { SearchBar } from '../../components/ui/SearchBar'
import { Toast } from '../../components/ui/Toast'
import { AppShell } from '../../components/layout/AppShell'
import { useQuery } from '../../lib/data/useQuery'
import { fetchPendingReview } from '../../lib/data/practiceLogs'
import { fetchStudents } from '../../lib/data/profiles'
import { useToast } from '../../lib/useToast'
import { useAuth } from '../../lib/AuthProvider'
import { PickerMenu } from '../../components/ui/PickerMenu'
import { fetchReviewContext } from '../../lib/data/classrooms'
import { NO_ASSIGNMENT, assignmentsWaiting, filterReview, type ReviewFilter } from '../../lib/reviewFilter'
import { INACTIVE_AFTER_DAYS, inactivePupils, inactivityText } from '../../lib/inactivity'

export function TeacherDashboard() {
  const navigate = useNavigate()
  const pending = useQuery(() => fetchPendingReview(), [])
  const students = useQuery(() => fetchStudents(), [])
  const [search, setSearch] = useState('')
  const [showAllInactive, setShowAllInactive] = useState(false)
  const { profile } = useAuth()
  const [filter, setFilter] = useState<ReviewFilter>({ sort: 'oldest' })
  const waitingIds = [...new Set((pending.data ?? []).flatMap((l) => (l.assignment_id ? [l.assignment_id] : [])))]
  const context = useQuery(
    () => (profile ? fetchReviewContext(profile.id, waitingIds) : Promise.resolve(undefined)),
    [profile?.id, waitingIds.join(',')],
  )
  const { message } = useToast()

  function nameFor(userId: string): string {
    return students.data?.find((s) => s.id === userId)?.full_name ?? 'Žák'
  }

  const inactive = inactivePupils(students.data ?? [], new Date())
  const shownInactive = showAllInactive ? inactive : inactive.slice(0, 5)

  const query = search.trim().toLowerCase()
  const byName = query ? pending.data?.filter((log) => nameFor(log.user_id).toLowerCase().includes(query)) : pending.data
  const filteredPending = byName && filterReview(byName, filter, context.data?.membersOf ?? new Map())
  const waitingPerAssignment = assignmentsWaiting(pending.data ?? [])
  const classLabel = context.data?.classrooms.find((c) => c.id === filter.classroomId)?.name ?? 'Všechny třídy'
  const assignmentLabel = !filter.assignmentId
    ? 'Všechny úkoly'
    : filter.assignmentId === NO_ASSIGNMENT
      ? 'Bez úkolu'
      : (context.data?.titles.get(filter.assignmentId) ?? 'Úkol')
  const filteredStudents = query
    ? (students.data ?? []).filter((s) => s.full_name.toLowerCase().includes(query))
    : students.data

  return (
    <AppShell role="teacher">
      {message && <Toast message={message} />}
      <div className="space-y-4 flex-1">
        <h1 className="text-xl">Přehled žáků</h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Hledat žáka" />

        <div>
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">
            Ke kontrole ({filteredPending?.length ?? 0})
          </h2>
          {(pending.data?.length ?? 0) > 1 && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {(context.data?.classrooms.length ?? 0) > 1 && (
                <PickerMenu
                  label={classLabel}
                  ariaLabel="Filtrovat podle třídy"
                  options={[
                    { value: '', label: 'Všechny třídy' },
                    ...(context.data?.classrooms ?? []).map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  onPick={(value) => setFilter((f) => ({ ...f, classroomId: value || undefined }))}
                />
              )}
              {waitingPerAssignment.size > 1 && (
                <PickerMenu
                  label={assignmentLabel}
                  ariaLabel="Filtrovat podle úkolu"
                  options={[
                    { value: '', label: 'Všechny úkoly' },
                    ...[...waitingPerAssignment].map(([id, count]) => ({
                      value: id,
                      label: id === NO_ASSIGNMENT ? 'Bez úkolu' : (context.data?.titles.get(id) ?? 'Úkol'),
                      hint: String(count),
                    })),
                  ]}
                  onPick={(value) => setFilter((f) => ({ ...f, assignmentId: value || undefined }))}
                />
              )}
              <button
                type="button"
                onClick={() => setFilter((f) => ({ ...f, sort: f.sort === 'oldest' ? 'newest' : 'oldest' }))}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-heading font-semibold text-text-primary hover:bg-bg-card-alt"
              >
                {filter.sort === 'oldest' ? '↑ Nejstarší první' : '↓ Nejnovější první'}
              </button>
              {(filter.classroomId || filter.assignmentId) && (
                <button
                  type="button"
                  className="text-xs text-text-muted underline underline-offset-2"
                  onClick={() => setFilter((f) => ({ sort: f.sort }))}
                >
                  Zrušit filtr
                </button>
              )}
            </div>
          )}
          {pending.loading && <p className="text-text-muted text-sm">Načítám…</p>}
          {filteredPending?.length === 0 && <p className="text-text-muted text-sm">Vše zkontrolováno 🎉</p>}
          <div className="space-y-2">
            {filteredPending?.map((log) => (
              <button
                key={log.id}
                className="w-full flex items-center justify-between rounded-2xl bg-bg-card shadow-clay-sm p-3.5 text-left"
                onClick={() => navigate('/teacher/grading', { state: { studentId: log.user_id, logId: String(log.id) } })}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={nameFor(log.user_id)} size={38} />
                  <div>
                    <div className="font-heading font-semibold text-sm">{nameFor(log.user_id)}</div>
                    <div className="text-text-muted text-xs">
                      {new Date(log.created_at).toLocaleDateString('cs-CZ')}
                      {log.assignment_id && context.data?.titles.get(log.assignment_id)
                        ? ` · ${context.data.titles.get(log.assignment_id)}`
                        : ''}
                    </div>
                  </div>
                </div>
                <Badge tone="pending">Nové</Badge>
              </button>
            ))}
          </div>
        </div>

        {!query && inactive.length > 0 && (
          <div>
            <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">
              Dlouho necvičili ({inactive.length})
            </h2>
            <p className="text-xs text-text-muted -mt-1 mb-2">
              Bez nahrávky {INACTIVE_AFTER_DAYS} a více dní. Klepni a zadej jim úkol, ať se zase rozehrají.
            </p>
            <div className="space-y-2">
              {shownInactive.map(({ pupil, days }) => (
                <button
                  key={pupil.id}
                  className="w-full flex items-center justify-between gap-2 rounded-2xl bg-bg-card shadow-clay-sm p-3.5 text-left"
                  onClick={() => navigate('/teacher/grading', { state: { studentId: pupil.id } })}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={pupil.full_name} size={38} />
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-sm truncate">{pupil.full_name}</div>
                      <div className={`text-xs ${days === null || days >= 14 ? 'text-coral-dark' : 'text-text-muted'}`}>
                        {inactivityText(days)}
                      </div>
                    </div>
                  </div>
                  <span aria-hidden className="text-text-muted text-sm">›</span>
                </button>
              ))}
            </div>
            {inactive.length > 5 && (
              <button
                className="mt-2 text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
                onClick={() => setShowAllInactive(!showAllInactive)}
              >
                {showAllInactive ? 'Méně' : `Zobrazit všech ${inactive.length}`}
              </button>
            )}
          </div>
        )}

        <div>
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">Ostatní žáci</h2>
          <div className="space-y-2">
            {filteredStudents?.map((student) => (
              <button
                key={student.id}
                className="w-full flex items-center justify-between rounded-2xl bg-bg-card shadow-clay-sm p-3.5 text-left"
                onClick={() => navigate('/teacher/grading', { state: { studentId: student.id } })}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={student.full_name} size={38} />
                  <div>
                    <div className="font-heading font-semibold text-sm">{student.full_name}</div>
                    <div className="text-text-muted text-xs">Streak {student.streak} dní</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
