import { useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../../components/ui/SearchBar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PasswordReauthModal } from '../../components/ui/PasswordReauthModal'
import { ResetPasswordModal } from '../../components/ui/ResetPasswordModal'
import { AppShell } from '../../components/layout/AppShell'
import { useQuery } from '../../lib/data/useQuery'
import { approveStudent, deleteStudent, fetchStudents } from '../../lib/data/profiles'
import { adjustStudentStars } from '../../lib/data/practiceLogs'
import { useToast } from '../../lib/useToast'
import { isReauthed } from '../../lib/reauth'
import { getErrorMessage } from '../../lib/errors'
import type { Profile } from '../../lib/data/types'

export function Students() {
  const navigate = useNavigate()
  const students = useQuery(() => fetchStudents(), [])
  const [search, setSearch] = useState('')
  const [approving, setApproving] = useState<string>()
  const [deleting, setDeleting] = useState<string>()
  const [reauthOpen, setReauthOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Profile>()
  const [resetTarget, setResetTarget] = useState<Profile>()
  const [starring, setStarring] = useState<string>()
  const { message, show } = useToast()

  const query = search.trim().toLowerCase()
  const matches = (name: string) => name.toLowerCase().includes(query)

  const pending = (students.data ?? []).filter((s) => !s.is_approved && matches(s.full_name))
  const approved = (students.data ?? []).filter((s) => s.is_approved && matches(s.full_name))

  async function handleApprove(id: string) {
    setApproving(id)
    try {
      await approveStudent(id)
      show('Žák byl schválen')
      students.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Schválení se nepovedlo, zkus to znovu.'))
    } finally {
      setApproving(undefined)
    }
  }

  async function handleStars(student: Profile, delta: 1 | -1) {
    setStarring(student.id)
    try {
      await adjustStudentStars(student.id, delta)
      show(delta > 0 ? `⭐ Hvězda pro ${student.full_name}` : 'Hvězda odebrána')
      students.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Změna hvězd se nepovedla, zkus to znovu.'))
    } finally {
      setStarring(undefined)
    }
  }

  function requestDelete(student: Profile) {
    setConfirmTarget(student)
    if (!isReauthed()) setReauthOpen(true)
  }

  function requestReset(student: Profile) {
    setResetTarget(student)
    if (!isReauthed()) setReauthOpen(true)
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return
    const id = confirmTarget.id
    setConfirmTarget(undefined)
    setDeleting(id)
    try {
      await deleteStudent(id)
      show('Profil žáka byl smazán')
      students.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Smazání se nepovedlo, zkus to znovu.'))
    } finally {
      setDeleting(undefined)
    }
  }

  function renderDeleteButton(student: Profile) {
    return (
      <Button
        variant="destructive"
        className="shrink-0 !px-3 !py-1.5 text-xs"
        disabled={deleting === student.id}
        onClick={() => requestDelete(student)}
      >
        Smazat
      </Button>
    )
  }

  function renderResetButton(student: Profile) {
    return (
      <Button variant="ghost" className="shrink-0 !px-3 !py-1.5 text-xs" onClick={() => requestReset(student)}>
        Nové heslo
      </Button>
    )
  }

  return (
    <AppShell role="teacher">
      {message && <Toast message={message} />}
      <PasswordReauthModal
        open={reauthOpen}
        onCancel={() => {
          setReauthOpen(false)
          setConfirmTarget(undefined)
          setResetTarget(undefined)
        }}
        onSuccess={() => setReauthOpen(false)}
      />
      {!reauthOpen && resetTarget && (
        <ResetPasswordModal
          userId={resetTarget.id}
          name={resetTarget.full_name}
          onClose={() => setResetTarget(undefined)}
        />
      )}
      <ConfirmDialog
        open={!reauthOpen && !!confirmTarget}
        title="Smazat profil žáka?"
        message={
          confirmTarget
            ? `Nenávratně smažeš profil, nahrávky a odezvu žáka „${confirmTarget.full_name}“. Přihlašovací účet zůstane existovat, ale žák se po smazání profilu do appky nedostane.`
            : undefined
        }
        confirmLabel="Smazat"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(undefined)}
      />

      <div className="space-y-4 flex-1">
        <h1 className="text-xl">Žáci</h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Hledat žáka" />
        {students.loading && !students.data && <Skeleton rows={4} height="h-20" />}

        {pending.length > 0 && (
          <div>
            <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">
              Čekají na schválení ({pending.length})
            </h2>
            <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
              {pending.map((student) => (
                <div
                  key={student.id}
                  className="w-full flex items-center justify-between gap-2.5 rounded-2xl bg-bg-card shadow-clay-sm p-3.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={student.full_name} size={38} />
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-sm truncate">{student.full_name}</div>
                      <div className="text-text-muted text-xs">Nový registrovaný žák</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5 text-xs"
                      disabled={approving === student.id}
                      onClick={() => handleApprove(student.id)}
                    >
                      Schválit
                    </Button>
                    {renderDeleteButton(student)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">
            {pending.length > 0 ? 'Schválení žáci' : 'Žáci'}
          </h2>
          <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
            {approved.map((student) => (
              <div key={student.id} className="w-full rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <button
                  className="flex items-center gap-2.5 min-w-0 text-left"
                  onClick={() => navigate('/teacher/grading', { state: { studentId: student.id } })}
                >
                  <Avatar name={student.full_name} size={38} />
                  <div className="min-w-0">
                    <div className="font-heading font-semibold text-sm truncate">{student.full_name}</div>
                    <div className="text-text-muted text-xs">
                      🔥 {student.streak} · ✨ {student.xp ?? 0} XP
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {renderResetButton(student)}
                  {renderDeleteButton(student)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-xs text-text-muted">Hvězdy za vystoupení</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="!px-2.5 !py-1 text-xs"
                    aria-label={`Odebrat hvězdu: ${student.full_name}`}
                    disabled={starring === student.id || student.stars <= 0}
                    onClick={() => handleStars(student, -1)}
                  >
                    −
                  </Button>
                  <span className="text-sm font-heading font-semibold min-w-10 text-center">⭐ {student.stars}</span>
                  <Button
                    variant="secondary"
                    className="!px-2.5 !py-1 text-xs"
                    aria-label={`Přidat hvězdu: ${student.full_name}`}
                    disabled={starring === student.id}
                    onClick={() => handleStars(student, 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
