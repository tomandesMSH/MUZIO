import { useState, type ReactNode } from 'react'
import { PupilFlames } from '../../components/teacher/PupilFlames'
import { TeacherDaysEditor } from '../../components/teacher/TeacherDaysEditor'
import { fetchImportedFlames, fetchPupilFlameDays } from '../../lib/data/pupilFlames'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { PracticeCalendar } from '../../components/gamification/PracticeCalendar'
import { RatingNotes } from '../../components/gamification/RatingNotes'
import { AssignToStudentModal } from '../../components/classrooms/AssignToStudentModal'
import { StudentNotes } from '../../components/teacher/StudentNotes'
import { MessageToPupil } from '../../components/teacher/MessageToPupil'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchAllStudents, fetchStudents } from '../../lib/data/profiles'
import { fetchStudentLogs } from '../../lib/data/practiceLogs'
import { isReviewed, isSkipped } from '../../lib/grading'
import { BeforeAfter } from '../../components/feedback/BeforeAfter'
import { fetchPiecesByIds } from '../../lib/data/ownPieces'
import { fetchPupilAssignments, fetchStudentClassroomsForTeacher, fetchTeacherClassrooms } from '../../lib/data/classrooms'
import { LockedPupil } from '../../components/teacher/LockedPupil'
import { dueLabel } from '../../lib/dueDate'
import { NavIcon } from '../../components/layout/NavIcon'

const RECENT = 5

// The admin panel has no menu around it (like the admin dashboard).
function Shell({ asAdmin, children }: { asAdmin: boolean; children: ReactNode }) {
  return asAdmin ? <div className="max-w-3xl mx-auto p-6">{children}</div> : <AppShell role="teacher">{children}</AppShell>
}

// A pupil at a glance for the teacher: practice calendar, assignments, the
// latest recordings and the teacher's own notes.
// asAdmin: the same card in the admin panel (/moderator/students/:id) - any
// pupil of the school, read only (no assignments, days, mail or notes).
export function StudentCard({ asAdmin = false }: { asAdmin?: boolean }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const students = useQuery(() => (asAdmin ? fetchAllStudents() : fetchStudents()), [asAdmin])
  const logs = useQuery(() => fetchStudentLogs(id), [id])
  const assignments = useQuery(
    () => (profile && !asAdmin ? fetchPupilAssignments(profile.id, id).catch(() => []) : Promise.resolve([])),
    [profile?.id, id, asAdmin],
  )
  const pieceIds = [...new Set((logs.data ?? []).flatMap((l) => (l.own_piece_id ? [l.own_piece_id] : [])))]
  const pieces = useQuery(() => fetchPiecesByIds(pieceIds).catch(() => new Map()), [pieceIds.join(',')])
  const flameDays = useQuery(() => fetchPupilFlameDays(id).catch(() => null), [id])
  const importedFlames = useQuery(() => fetchImportedFlames(id), [id])
  const [assignOpen, setAssignOpen] = useState(false)
  // Not in any of the teacher's classrooms = no access to their practice
  // (RLS); the card says so instead of showing empty sections. A failed
  // check (null) leaves the card as it is.
  const memberOf = useQuery(
    () => (profile && !asAdmin ? fetchStudentClassroomsForTeacher(profile.id, id).catch(() => null) : Promise.resolve(null)),
    [profile?.id, id, asAdmin],
  )
  const ownClassrooms = useQuery(
    () => (profile ? fetchTeacherClassrooms(profile.id).catch(() => null) : Promise.resolve(null)),
    [profile?.id],
  )
  const locked = memberOf.data?.length === 0

  const pupil = students.data?.find((s) => s.id === id)
  const list = logs.data ?? []
  const lastAt = list[0]?.created_at
  const waiting = list.filter((l) => !isReviewed(l)).length
  const open = (assignments.data ?? []).filter((a) => !a.done)
  const doneCount = (assignments.data ?? []).length - open.length
  const today = new Date()

  if (students.data && !pupil) {
    return (
      <Shell asAdmin={asAdmin}>
        <p className="text-sm text-text-muted">Žák nenalezen.</p>
      </Shell>
    )
  }

  return (
    <Shell asAdmin={asAdmin}>
      <div className="space-y-5 flex-1">
        <button
          className="text-sm text-text-muted"
          onClick={() => (asAdmin ? navigate('/moderator', { state: { tab: 'users' } }) : navigate('/teacher/students'))}
        >
          {asAdmin ? '← Admin · Uživatelé' : '← Žáci'}
        </button>
        {asAdmin && (
          <p className="rounded-xl bg-bg-card-alt px-3 py-2 text-xs text-text-muted">
            Díváš se jako admin: všechna cvičení žáka, jen pro čtení. Úkoly, poštu a poznámky má učitel v učitelském panelu.
          </p>
        )}

        {!pupil ? (
          <Skeleton rows={2} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={pupil.full_name} size={52} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl truncate">{pupil.full_name}</h1>
              <p className="text-xs text-text-muted">
                {locked ? 'Není v žádné z tvých tříd' : `${pupil.xp ?? 0} XP · ⭐ ${pupil.stars}`}
                {locked ? '' : lastAt ? ` · naposledy ${new Date(lastAt).toLocaleDateString('cs-CZ')}` : ' · zatím bez nahrávky'}
              </p>
            </div>
            {!locked && !asAdmin && (<div className="flex gap-2">
              <Button className="!px-3 !py-1.5 text-xs" onClick={() => setAssignOpen(true)}>
                Zadat úkol
              </Button>
              <Button
                variant="ghost"
                className="!px-3 !py-1.5 text-xs"
                onClick={() => navigate('/teacher/grading', { state: { studentId: id } })}
              >
                Všechny nahrávky{waiting > 0 ? ` (${waiting} čeká)` : ''}
              </Button>
            </div>)}
          </div>
        )}

        {locked ? (
          <LockedPupil hasClassrooms={(ownClassrooms.data?.length ?? 0) > 0} />
        ) : (
        <>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Kalendář cvičení</h2>
          <PracticeCalendar
            logs={list.map((l) => ({ created_at: l.created_at, duration_seconds: l.duration_seconds ?? null }))}
            today={today}
          />
          {!asAdmin && (
            <p className="mt-1.5 text-[11px] text-text-muted">
              Vidíš nahrávky k úkolům a vlastním skladbám. Samostatné cvičení jen tehdy, když ho žák sdílí.
            </p>
          )}
        </div>

        {pupil && flameDays.data && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Plamínky a svět</h2>
            <PupilFlames world={pupil.world} dayKeys={flameDays.data} importedFlames={importedFlames.data ?? 0} />
          </div>
        )}

        {pupil && !asAdmin && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Připsat den cvičení</h2>
            <TeacherDaysEditor studentId={id} onChanged={flameDays.refetch} />
          </div>
        )}

        <div className={asAdmin ? '' : 'grid gap-5 md:grid-cols-2'}>
          {!asAdmin && (<div>
            <h2 className="text-sm font-heading font-semibold mb-2">
              Úkoly{assignments.data && assignments.data.length > 0 ? ` · hotovo ${doneCount} z ${assignments.data.length}` : ''}
            </h2>
            {assignments.loading && !assignments.data && <Skeleton rows={2} />}
            {assignments.data?.length === 0 && <p className="text-sm text-text-muted">Žádné úkoly od tebe.</p>}
            <ul className="space-y-1.5">
              {(assignments.data ?? []).slice(0, 8).map(({ assignment, classroomName, done }) => {
                const due = !done && assignment.due_date ? dueLabel(assignment.due_date, today) : undefined
                return (
                  <li key={assignment.id} className="flex items-center gap-2 rounded-xl bg-bg-card px-3 py-2 shadow-clay-sm">
                    <NavIcon name={done ? 'check' : 'clock'} className={`w-4 h-4 shrink-0 ${done ? 'text-coral' : 'text-text-muted'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-heading font-semibold">{assignment.title}</div>
                      <div className="text-[11px] text-text-muted">
                        {classroomName}
                        {due ? ` · ${due.text}` : ''}
                      </div>
                    </div>
                    <span className="text-[11px] text-text-muted shrink-0">{done ? 'odevzdáno' : 'čeká'}</span>
                  </li>
                )
              })}
            </ul>
          </div>)}

          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Poslední nahrávky</h2>
            {logs.loading && !logs.data && <Skeleton rows={2} />}
            {logs.data?.length === 0 && <p className="text-sm text-text-muted">Zatím žádné nahrávky.</p>}
            <ul className="space-y-1.5">
              {list.slice(0, RECENT).map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    disabled={asAdmin}
                    className="flex w-full items-center gap-2 rounded-xl bg-bg-card px-3 py-2 text-left shadow-clay-sm disabled:cursor-default"
                    onClick={() => navigate('/teacher/grading', { state: { studentId: id, logId: String(log.id) } })}
                  >
                    <span className="text-xs text-text-muted tabular-nums shrink-0">
                      {new Date(log.created_at).toLocaleDateString('cs-CZ')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                      {log.feedback_good || log.feedback_improve || (log.student_note ? `Vzkaz: ${log.student_note}` : '')}
                    </span>
                    {isReviewed(log) && log.rating ? (
                      <span className="shrink-0 text-xs">
                        <RatingNotes rating={log.rating} />
                      </span>
                    ) : isSkipped(log) ? (
                      <span className="shrink-0 text-[10px] text-text-muted">bez hodnocení</span>
                    ) : asAdmin ? (
                      <span className="shrink-0 text-[10px] text-text-muted">čeká na hodnocení</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-coral-tint px-2 py-0.5 text-[10px] font-heading font-semibold text-coral-dark">
                        Ohodnotit
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <BeforeAfter
          logs={logs.data}
          heading="Pokrok žáka"
          intro="První a poslední nahrávka stejného úkolu nebo vlastní skladby, třeba na třídní schůzky."
          titleFor={(pair) =>
            pair.assignmentId
              ? assignments.data?.find((a) => a.assignment.id === pair.assignmentId)?.assignment.title
              : pair.ownPieceId
                ? pieces.data?.get(pair.ownPieceId)?.title
                : undefined
          }
        />

        {profile && !asAdmin && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Hudební pošta</h2>
            <MessageToPupil teacherId={profile.id} studentId={id} />
          </div>
        )}

        {!asAdmin && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">
              Moje poznámky <span className="font-body font-normal text-xs text-text-muted">(vidíš jen ty)</span>
            </h2>
            <StudentNotes studentId={id} />
          </div>
        )}
        </>
        )}
      </div>
      {pupil && !asAdmin && (
        <AssignToStudentModal
          open={assignOpen}
          studentId={id}
          studentName={pupil.full_name}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false)
            assignments.refetch()
          }}
        />
      )}
    </Shell>
  )
}
