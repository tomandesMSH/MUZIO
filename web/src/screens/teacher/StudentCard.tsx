import { useState } from 'react'
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
import { fetchStudents } from '../../lib/data/profiles'
import { fetchStudentLogs } from '../../lib/data/practiceLogs'
import { isReviewed, isSkipped } from '../../lib/grading'
import { BeforeAfter } from '../../components/feedback/BeforeAfter'
import { fetchPiecesByIds } from '../../lib/data/ownPieces'
import { fetchPupilAssignments } from '../../lib/data/classrooms'
import { dueLabel } from '../../lib/dueDate'
import { NavIcon } from '../../components/layout/NavIcon'

const RECENT = 5

// A pupil at a glance for the teacher: practice calendar, assignments, the
// latest recordings and the teacher's own notes.
export function StudentCard() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const students = useQuery(() => fetchStudents(), [])
  const logs = useQuery(() => fetchStudentLogs(id), [id])
  const assignments = useQuery(
    () => (profile ? fetchPupilAssignments(profile.id, id).catch(() => []) : Promise.resolve([])),
    [profile?.id, id],
  )
  const pieceIds = [...new Set((logs.data ?? []).flatMap((l) => (l.own_piece_id ? [l.own_piece_id] : [])))]
  const pieces = useQuery(() => fetchPiecesByIds(pieceIds).catch(() => new Map()), [pieceIds.join(',')])
  const flameDays = useQuery(() => fetchPupilFlameDays(id).catch(() => null), [id])
  const importedFlames = useQuery(() => fetchImportedFlames(id), [id])
  const [assignOpen, setAssignOpen] = useState(false)

  const pupil = students.data?.find((s) => s.id === id)
  const list = logs.data ?? []
  const lastAt = list[0]?.created_at
  const waiting = list.filter((l) => !isReviewed(l)).length
  const open = (assignments.data ?? []).filter((a) => !a.done)
  const doneCount = (assignments.data ?? []).length - open.length
  const today = new Date()

  if (students.data && !pupil) {
    return (
      <AppShell role="teacher">
        <p className="text-sm text-text-muted">Žák nenalezen.</p>
      </AppShell>
    )
  }

  return (
    <AppShell role="teacher">
      <div className="space-y-5 flex-1">
        <button className="text-sm text-text-muted" onClick={() => navigate('/teacher/students')}>
          ← Žáci
        </button>

        {!pupil ? (
          <Skeleton rows={2} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={pupil.full_name} size={52} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl truncate">{pupil.full_name}</h1>
              <p className="text-xs text-text-muted">
                {pupil.xp ?? 0} XP · ⭐ {pupil.stars}
                {lastAt ? ` · naposledy ${new Date(lastAt).toLocaleDateString('cs-CZ')}` : ' · zatím bez nahrávky'}
              </p>
            </div>
            <div className="flex gap-2">
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
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Kalendář cvičení</h2>
          <PracticeCalendar
            logs={list.map((l) => ({ created_at: l.created_at, duration_seconds: l.duration_seconds ?? null }))}
            today={today}
          />
          <p className="mt-1.5 text-[11px] text-text-muted">
            Vidíš nahrávky k úkolům a vlastním skladbám. Samostatné cvičení jen tehdy, když ho žák sdílí.
          </p>
        </div>

        {pupil && flameDays.data && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Plamínky a svět</h2>
            <PupilFlames world={pupil.world} dayKeys={flameDays.data} importedFlames={importedFlames.data ?? 0} />
          </div>
        )}

        {pupil && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Připsat den cvičení</h2>
            <TeacherDaysEditor studentId={id} onChanged={flameDays.refetch} />
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
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
          </div>

          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Poslední nahrávky</h2>
            {logs.loading && !logs.data && <Skeleton rows={2} />}
            {logs.data?.length === 0 && <p className="text-sm text-text-muted">Zatím žádné nahrávky.</p>}
            <ul className="space-y-1.5">
              {list.slice(0, RECENT).map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl bg-bg-card px-3 py-2 text-left shadow-clay-sm"
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

        {profile && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-2">Hudební pošta</h2>
            <MessageToPupil teacherId={profile.id} studentId={id} />
          </div>
        )}

        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">
            Moje poznámky <span className="font-body font-normal text-xs text-text-muted">(vidíš jen ty)</span>
          </h2>
          <StudentNotes studentId={id} />
        </div>
      </div>
      {pupil && (
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
    </AppShell>
  )
}
