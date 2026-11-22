import { useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { SearchBar } from '../../components/ui/SearchBar'
import { Toast } from '../../components/ui/Toast'
import { AppShell } from '../../components/layout/AppShell'
import { useQuery } from '../../lib/data/useQuery'
import { fetchPendingReview, markReviewed } from '../../lib/data/practiceLogs'
import { refreshNavBadges } from '../../lib/navBadges'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { fetchStudents } from '../../lib/data/profiles'
import { fetchPupilFlameCounts } from '../../lib/data/pupilFlames'
import { PupilFlamesLine } from '../../components/teacher/PupilFlamesLine'
import { useToast } from '../../lib/useToast'
import { useAuth } from '../../lib/AuthProvider'
import { PickerMenu } from '../../components/ui/PickerMenu'
import { fetchReviewContext } from '../../lib/data/classrooms'
import { fetchPiecesByIds, type OwnPiece } from '../../lib/data/ownPieces'
import { NO_ASSIGNMENT, assignmentsWaiting, filterReview, type ReviewFilter } from '../../lib/reviewFilter'
import { WeeklyOverview } from '../../components/teacher/WeeklyOverview'
import { INACTIVE_AFTER_DAYS, inactivePupils, inactivityText } from '../../lib/inactivity'

export function TeacherDashboard() {
  const navigate = useNavigate()
  const pending = useQuery(() => fetchPendingReview(), [])
  const students = useQuery(() => fetchStudents(), [])
  const studentIds = (students.data ?? []).map((s) => s.id)
  // A failure just leaves the flames out.
  const flameCounts = useQuery(
    () => fetchPupilFlameCounts(studentIds).catch(() => null),
    [studentIds.join(',')],
  )
  const [search, setSearch] = useState('')
  const [showAllInactive, setShowAllInactive] = useState(false)
  const { profile } = useAuth()
  const [filter, setFilter] = useState<ReviewFilter>({ sort: 'oldest' })
  const waitingIds = [...new Set((pending.data ?? []).flatMap((l) => (l.assignment_id ? [l.assignment_id] : [])))]
  const pieceIds = [...new Set((pending.data ?? []).flatMap((l) => (l.own_piece_id ? [l.own_piece_id] : [])))]
  const pieces = useQuery(
    () => fetchPiecesByIds(pieceIds).catch(() => new Map<string, OwnPiece>()),
    [pieceIds.join(',')],
  )
  const context = useQuery(
    () => (profile ? fetchReviewContext(profile.id, waitingIds) : Promise.resolve(undefined)),
    [profile?.id, waitingIds.join(',')],
  )
  const { message, show } = useToast()
  const [marking, setMarking] = useState<string | undefined>()
  const [confirmAll, setConfirmAll] = useState(false)

  // "Označit jako ohodnocené": off the list without a grade - one recording,
  // or every one shown (filters and search apply).
  async function markAsReviewed(logIds: string[]) {
    setMarking(logIds.length === 1 ? logIds[0] : 'all')
    try {
      await markReviewed(logIds)
      refreshNavBadges()
      pending.refetch()
      show(logIds.length === 1 ? 'Označeno jako ohodnocené' : `Označeno ${logIds.length} nahrávek`)
    } catch (err) {
      show(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setMarking(undefined)
    }
  }

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
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-heading font-semibold text-text-muted">
              Ke kontrole ({filteredPending?.length ?? 0})
            </h2>
            {(filteredPending?.length ?? 0) > 1 && (
              <button
                type="button"
                disabled={marking === 'all'}
                onClick={() => setConfirmAll(true)}
                className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary disabled:opacity-40"
              >
                Označit vše ({filteredPending?.length})
              </button>
            )}
          </div>
          <ConfirmDialog
            open={confirmAll}
            title="Označit vše jako ohodnocené?"
            message={`${filteredPending?.length ?? 0} zobrazených nahrávek zmizí z kontroly bez hodnocení. Žáci za ně nedostanou XP.`}
            confirmLabel="Označit vše"
            onConfirm={() => {
              setConfirmAll(false)
              void markAsReviewed((filteredPending ?? []).map((l) => String(l.id)))
            }}
            onCancel={() => setConfirmAll(false)}
          />
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
          {pending.loading && !pending.data && <Skeleton rows={2} />}
          {filteredPending?.length === 0 && <p className="text-text-muted text-sm">Vše zkontrolováno</p>}
          <div className="space-y-2">
            {filteredPending?.map((log) => (
              <div key={log.id} className="rounded-2xl bg-bg-card shadow-clay-sm">
                <button
                  className="w-full flex items-center justify-between p-3.5 pb-2 text-left"
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
                      {log.own_piece_id && pieces.data?.get(log.own_piece_id)
                        ? ` · ${pieces.data.get(log.own_piece_id)?.title}`
                        : ''}
                    </div>
                  </div>
                </div>
                <Badge tone="pending">Nové</Badge>
                </button>
                <div className="flex justify-end px-3.5 pb-2.5">
                  <button
                    type="button"
                    disabled={marking === String(log.id)}
                    onClick={() => void markAsReviewed([String(log.id)])}
                    className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary disabled:opacity-40"
                  >
                    Označit jako ohodnocené
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!query && <WeeklyOverview />}

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
                  onClick={() => navigate(`/teacher/students/${pupil.id}`)}
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
                onClick={() => navigate(`/teacher/students/${student.id}`)}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={student.full_name} size={38} />
                  <div>
                    <div className="font-heading font-semibold text-sm">{student.full_name}</div>
                    {flameCounts.data !== null && (
                      <div className="text-text-muted text-xs">
                        <PupilFlamesLine flames={flameCounts.data?.get(student.id) ?? (flameCounts.data ? 0 : undefined)} world={student.world} />
                      </div>
                    )}
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
