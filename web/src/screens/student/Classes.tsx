import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { Toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { InvitesCard } from '../../components/classrooms/InvitesCard'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import {
  fetchMyTeacherNames,
  fetchStudentAssignments,
  fetchStudentClassrooms,
  joinClassroom,
  leaveClassroom,
} from '../../lib/data/classrooms'
import { fetchCompletedAssignmentIds } from '../../lib/data/practiceLogs'
import { useToast } from '../../lib/useToast'
import { getErrorMessage } from '../../lib/errors'
import type { Classroom } from '../../lib/data/types'

// The pupil's classes: join one with the teacher's code, see each class with
// its teacher and how the assignments are going, leave one.
export function Classes() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { message, show } = useToast()
  const classrooms = useQuery(() => (profile ? fetchStudentClassrooms(profile.id) : Promise.resolve([])), [profile?.id])
  const teachers = useQuery(() => fetchMyTeacherNames(), [classrooms.data?.length])
  const assignments = useQuery(() => fetchStudentAssignments().catch(() => []), [classrooms.data?.length])
  const assignmentIds = (assignments.data ?? []).map((a) => a.id)
  const completed = useQuery(
    () => (profile ? fetchCompletedAssignmentIds(profile.id, assignmentIds) : Promise.resolve(new Set<string>())),
    [profile?.id, assignmentIds.join(',')],
  )
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string>()
  const [leaving, setLeaving] = useState<Classroom>()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setJoining(true)
    setError(undefined)
    try {
      await joinClassroom(code)
      setCode('')
      classrooms.refetch()
      show('Jsi ve třídě')
    } catch (err) {
      setError(getErrorMessage(err, 'Připojení se nepovedlo. Zkontroluj kód.'))
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (!profile || !leaving) return
    const classroom = leaving
    setLeaving(undefined)
    try {
      await leaveClassroom(classroom.id, profile.id)
      classrooms.refetch()
      show(`Opustil(a) jsi třídu ${classroom.name}`)
    } catch (err) {
      show(getErrorMessage(err, 'Opuštění třídy se nepovedlo, zkus to znovu.'))
    }
  }

  const doneIds = completed.data ?? new Set<string>()
  const list = classrooms.data ?? []

  return (
    <AppShell role="student">
      {message && <Toast message={message} />}
      <ConfirmDialog
        open={!!leaving}
        title={`Opustit třídu ${leaving?.name ?? ''}?`}
        message="Přestaneš vidět úkoly této třídy. Tvoje nahrávky a hodnocení zůstanou. Zpátky se připojíš kódem od učitele."
        confirmLabel="Opustit"
        onConfirm={handleLeave}
        onCancel={() => setLeaving(undefined)}
      />
      <div className="space-y-5 flex-1">
        <h1 className="text-xl">Třídy</h1>

        <InvitesCard onJoined={classrooms.refetch} />

        <form onSubmit={handleJoin} className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-2.5">
          <div className="font-heading font-semibold text-sm">Připojit se ke třídě</div>
          <p className="text-xs text-text-muted">Kód ti dá učitel (např. AB12CD).</p>
          <div className="flex gap-2">
            <Input
              aria-label="Kód od učitele"
              placeholder="Kód od učitele"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <Button type="submit" className="shrink-0 !px-4" disabled={joining || !code.trim()}>
              {joining ? 'Připojuji…' : 'Připojit'}
            </Button>
          </div>
          {error && <p className="text-sm text-coral-dark">{error}</p>}
        </form>

        {classrooms.loading && !classrooms.data && <Skeleton rows={2} />}
        {classrooms.data && list.length === 0 && (
          <p className="text-text-muted text-sm">Zatím nejsi v žádné třídě. Připoj se kódem od učitele.</p>
        )}

        {list.length > 0 && (
          <div>
            <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">Moje třídy ({list.length})</h2>
            <ul className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {list.map((classroom) => {
                const own = (assignments.data ?? []).filter((a) => a.classroom_id === classroom.id)
                const done = own.filter((a) => doneIds.has(a.id)).length
                const teacher = teachers.data?.get(classroom.teacher_id)
                return (
                  <li key={classroom.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-heading font-semibold truncate">{classroom.name}</div>
                        {teacher && <div className="text-xs text-text-muted">Učitel: {teacher}</div>}
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs text-text-muted underline underline-offset-2 hover:text-coral-dark"
                        onClick={() => setLeaving(classroom)}
                      >
                        Opustit
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-text-muted">
                        {own.length === 0 ? 'Zatím žádné úkoly' : `Úkoly: hotovo ${done} z ${own.length}`}
                      </span>
                      {own.length > done && (
                        <button
                          type="button"
                          className="text-xs font-heading font-semibold text-coral-dark"
                          onClick={() => navigate('/student/lessons')}
                        >
                          Zbývá {own.length - done} →
                        </button>
                      )}
                    </div>
                    {own.length > 0 && (
                      <div className="h-1.5 rounded-full bg-bg-card-alt overflow-hidden" aria-hidden>
                        <div className="h-full rounded-full bg-coral" style={{ width: `${(done / own.length) * 100}%` }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  )
}
