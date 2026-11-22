import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '../../components/ui/Skeleton'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PasswordReauthModal } from '../../components/ui/PasswordReauthModal'
import { ResetPasswordModal } from '../../components/ui/ResetPasswordModal'
import { SearchBar } from '../../components/ui/SearchBar'
import { Toast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchPupilFlameCounts } from '../../lib/data/pupilFlames'
import { PupilFlamesLine } from '../../components/teacher/PupilFlamesLine'
import { approveStudent, fetchAllUsers, setTeacherVerified } from '../../lib/data/profiles'
import { reinstateAccount, suspendAccount } from '../../lib/data/moderation'
import { deleteAccount, setUserAdmin, setUserRole } from '../../lib/data/adminUsers'
import { adjustStudentStars } from '../../lib/data/practiceLogs'
import { computeLevel } from '../../lib/game-logic'
import { EditAccountModal } from '../../components/admin/EditAccountModal'
import { isReauthed } from '../../lib/reauth'
import { useToast } from '../../lib/useToast'
import { getErrorMessage } from '../../lib/errors'
import { isTeacherAdmin } from '../../lib/roles'
import type { Profile } from '../../lib/data/types'

type Filter = 'all' | 'pending' | 'student' | 'teacher'

interface PendingChange {
  user: Profile
  title: string
  message: string
  confirmLabel: string
  run: () => Promise<void>
  success: string
}

// Students wait for approval and teachers for identity verification.
function isPending(user: Profile): boolean {
  return (user.role === 'student' && !user.is_approved) || (user.role === 'teacher' && !user.is_verified)
}

// Admin overview of every student and teacher account: approve new students,
// verify new teachers, reset a password, ban or reinstate. Other admins and the signed-in
// admin themselves are shown without actions - admin_reset_password (0020)
// refuses moderators anyway.
export function UsersSection() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const users = useQuery(() => fetchAllUsers(), [])
  const pupilIds = (users.data ?? []).filter((u) => u.role === 'student').map((u) => u.id)
  // A failure just leaves the flames out.
  const flameCounts = useQuery(() => fetchPupilFlameCounts(pupilIds).catch(() => null), [pupilIds.join(',')])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [resetTarget, setResetTarget] = useState<Profile>()
  const [banTarget, setBanTarget] = useState<Profile>()
  // A role / admin-rights change waiting for confirmation.
  const [pending, setPending] = useState<PendingChange>()
  const [editTarget, setEditTarget] = useState<Profile>()
  const [reauthOpen, setReauthOpen] = useState(false)
  const [busy, setBusy] = useState<string>()
  const { message, show } = useToast()

  const all = users.data ?? []
  const studentCount = all.filter((u) => u.role === 'student').length
  const teacherCount = all.filter((u) => u.role === 'teacher').length
  const pendingCount = all.filter(isPending).length

  const query = search.trim().toLowerCase()
  const visible = all
    .filter((u) => filter === 'all' || (filter === 'pending' ? isPending(u) : u.role === filter))
    .filter((u) => u.full_name.toLowerCase().includes(query) || (u.username ?? '').toLowerCase().includes(query))
    .sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'cs'))

  // Admins (and you) get no everyday actions - the database refuses those
  // for admin accounts anyway.
  function isProtected(user: Profile): boolean {
    return user.id === profile?.id || user.role === 'moderator' || !!user.is_moderator
  }

  // Role and admin rights: any account but yours and dedicated admin accounts
  // (migration 0028 enforces the same).
  function canChangeRole(user: Profile): boolean {
    return user.id !== profile?.id && user.role !== 'moderator'
  }

  // Renaming: any account but other dedicated admin accounts (0029).
  function canEdit(user: Profile): boolean {
    return user.id === profile?.id || user.role !== 'moderator'
  }

  function requestChange(change: PendingChange) {
    setPending(change)
    if (!isReauthed()) setReauthOpen(true)
  }

  function roleChange(user: Profile): PendingChange {
    const toTeacher = user.role === 'student'
    return {
      user,
      title: toTeacher ? 'Změnit roli na učitele?' : 'Změnit roli na žáka?',
      message: toTeacher
        ? `„${user.full_name}“ bude učitel (rovnou ověřený) a odejde ze tříd, ve kterých je jako žák. Nahrávky mu zůstanou.`
        : `„${user.full_name}“ bude žák${user.is_moderator ? ' a přijde o práva admina' : ''}. Učitel, který má třídy, se změnit nedá. Nejdřív třídy smaž nebo předej.`,
      confirmLabel: toTeacher ? 'Změnit na učitele' : 'Změnit na žáka',
      run: () => setUserRole(user.id, toTeacher ? 'teacher' : 'student'),
      success: toTeacher ? `„${user.full_name}“ je teď učitel` : `„${user.full_name}“ je teď žák`,
    }
  }

  function adminChange(user: Profile): PendingChange {
    const grant = !user.is_moderator
    return {
      user,
      title: grant ? 'Dát práva admina?' : 'Odebrat práva admina?',
      message: grant
        ? `„${user.full_name}“ uvidí admin dashboard: všechny účty, nahlášený obsah a historii, a bude moct banovat a měnit role.`
        : `„${user.full_name}“ zůstane učitelem, ale do admin dashboardu se už nedostane.`,
      confirmLabel: grant ? 'Dát práva' : 'Odebrat práva',
      run: () => setUserAdmin(user.id, grant),
      success: grant ? `„${user.full_name}“ je teď Učitel + Admin` : `„${user.full_name}“ už není admin`,
    }
  }

  function deleteChange(user: Profile): PendingChange {
    return {
      user,
      title: 'Smazat účet natrvalo?',
      message:
        `„${user.full_name}“ se smaže úplně: přihlášení, nahrávky, hodnocení, XP, hvězdy, odznaky a členství ve třídách. ` +
        (user.role === 'teacher'
          ? 'Učitel, který má třídy, smazat nejde. Nejdřív je předej nebo smaž v záložce Třídy. Hodnocení a odznaky, které dal žákům, zůstanou. '
          : '') +
        'Nejde to vrátit.',
      confirmLabel: 'Smazat natrvalo',
      run: () => deleteAccount(user.id),
      success: `Účet „${user.full_name}“ byl smazán`,
    }
  }

  function handleConfirmChange() {
    if (!pending) return
    const change = pending
    setPending(undefined)
    void runAction(change.user.id, change.run, change.success)
  }

  function requestReset(user: Profile) {
    setResetTarget(user)
    if (!isReauthed()) setReauthOpen(true)
  }

  function requestBan(user: Profile) {
    setBanTarget(user)
    if (!isReauthed()) setReauthOpen(true)
  }

  async function runAction(userId: string, action: () => Promise<void>, success: string) {
    setBusy(userId)
    try {
      await action()
      show(success)
      users.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(undefined)
    }
  }

  function handleConfirmBan() {
    if (!banTarget) return
    const target = banTarget
    setBanTarget(undefined)
    void runAction(target.id, () => suspendAccount(target.id), `Účet „${target.full_name}“ byl zabanován`)
  }

  return (
    <div className="space-y-3">
      {message && <Toast message={message} />}
      <PasswordReauthModal
        open={reauthOpen}
        onCancel={() => {
          setReauthOpen(false)
          setResetTarget(undefined)
          setBanTarget(undefined)
          setPending(undefined)
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
        open={!reauthOpen && !!banTarget}
        title="Zabanovat účet?"
        message={
          banTarget
            ? `Uživatel „${banTarget.full_name}“ se po přihlášení dostane jen na obrazovku s pozastaveným účtem. Kdykoli ho můžeš odbanovat.`
            : undefined
        }
        confirmLabel="Zabanovat"
        onConfirm={handleConfirmBan}
        onCancel={() => setBanTarget(undefined)}
      />

      <ConfirmDialog
        open={!reauthOpen && !!pending}
        title={pending?.title ?? ''}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        onConfirm={handleConfirmChange}
        onCancel={() => setPending(undefined)}
      />

      {editTarget && (
        <EditAccountModal
          user={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={() => {
            setEditTarget(undefined)
            show('Účet byl upraven')
            users.refetch()
          }}
        />
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Hledat podle jména nebo přihlašovacího jména" />
      <div className="flex gap-2 overflow-x-auto">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          Všichni ({all.length})
        </Chip>
        <Chip active={filter === 'pending'} onClick={() => setFilter('pending')}>
          Čekající ({pendingCount})
        </Chip>
        <Chip active={filter === 'student'} onClick={() => setFilter('student')}>
          Žáci ({studentCount})
        </Chip>
        <Chip active={filter === 'teacher'} onClick={() => setFilter('teacher')}>
          Učitelé ({teacherCount})
        </Chip>
      </div>

      {users.loading && !users.data && <Skeleton rows={4} height="h-14" />}
      {users.error && <p className="text-sm text-coral-dark">Načtení se nepovedlo: {users.error.message}</p>}

      <div className="space-y-2">
        {visible.map((user) => (
          <div key={user.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.full_name} size={38} />
              <div className="min-w-0">
                {user.role === 'student' ? (
                  <button
                    type="button"
                    className="block max-w-full truncate text-left font-heading font-semibold text-sm hover:underline underline-offset-2"
                    onClick={() => navigate(`/moderator/students/${user.id}`)}
                  >
                    {user.full_name} <span className="font-body font-normal text-xs text-text-muted">· karta žáka ›</span>
                  </button>
                ) : (
                  <div className="font-heading font-semibold text-sm truncate">{user.full_name}</div>
                )}
                <div className="text-text-muted text-xs truncate">
                  {user.role === 'teacher' ? 'Učitel' : 'Žák'}
                  {user.username ? ` · ${user.username}` : ''}
                </div>
                {user.role === 'student' && (
                  <div className="text-text-muted text-xs">
                    {flameCounts.data !== null && !(flameCounts.data && !flameCounts.data.has(user.id)) && (
                      <>
                        <PupilFlamesLine flames={flameCounts.data ? (flameCounts.data.get(user.id) ?? null) : undefined} />
                        {' · '}
                      </>
                    )}
                    {user.xp ?? 0} XP (level {computeLevel(user.xp ?? 0).level}) · ⭐ {user.stars}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {isProtected(user) && (
                <Badge>{user.id === profile?.id ? 'Ty' : isTeacherAdmin(user) ? 'Učitel + Admin' : 'Admin'}</Badge>
              )}
              {user.is_banned && <Badge tone="pending">Zabanovaný</Badge>}
              {user.role === 'teacher' && !user.is_verified && <Badge tone="pending">Čeká na ověření</Badge>}
              {user.role === 'student' && !user.is_approved && <Badge tone="pending">Čeká na schválení</Badge>}
            </div>

            {!isProtected(user) && (
              <div className="flex flex-wrap gap-1.5">
                <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => requestReset(user)}>
                  Nové heslo
                </Button>
                {user.role === 'student' && !user.is_approved && (
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() =>
                      runAction(user.id, () => approveStudent(user.id), `Žák „${user.full_name}“ byl schválen`)
                    }
                  >
                    Schválit žáka
                  </Button>
                )}
                {user.role === 'teacher' && !user.is_verified && (
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() =>
                      runAction(user.id, () => setTeacherVerified(user.id, true), `Učitel „${user.full_name}“ byl ověřen`)
                    }
                  >
                    Ověřit učitele
                  </Button>
                )}
                {user.is_banned ? (
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() =>
                      runAction(user.id, () => reinstateAccount(user.id), `Účet „${user.full_name}“ byl odbanován`)
                    }
                  >
                    Odbanovat
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() => requestBan(user)}
                  >
                    Zabanovat
                  </Button>
                )}
              </div>
            )}

            {(canChangeRole(user) || canEdit(user)) && (
              <div className="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                {canEdit(user) && (
                  <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setEditTarget(user)}>
                    Upravit
                  </Button>
                )}
                {canChangeRole(user) && (
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() => requestChange(roleChange(user))}
                  >
                    {user.role === 'student' ? 'Změnit na učitele' : 'Změnit na žáka'}
                  </Button>
                )}
                {user.role === 'student' && (
                  <span className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="!px-2.5 !py-1.5 text-xs"
                      aria-label={`Odebrat hvězdu: ${user.full_name}`}
                      disabled={busy === user.id || user.stars <= 0}
                      onClick={() => runAction(user.id, () => adjustStudentStars(user.id, -1).then(() => {}), 'Hvězda odebrána')}
                    >
                      ⭐ −
                    </Button>
                    <Button
                      variant="secondary"
                      className="!px-2.5 !py-1.5 text-xs"
                      aria-label={`Přidat hvězdu: ${user.full_name}`}
                      disabled={busy === user.id}
                      onClick={() =>
                        runAction(user.id, () => adjustStudentStars(user.id, 1).then(() => {}), `Hvězda pro ${user.full_name}`)
                      }
                    >
                      ⭐ +
                    </Button>
                  </span>
                )}
                {!isProtected(user) && (
                  <Button
                    variant="destructive"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() => requestChange(deleteChange(user))}
                  >
                    Smazat účet
                  </Button>
                )}
                {canChangeRole(user) && user.role === 'teacher' && (user.is_verified || user.is_moderator) && (
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={busy === user.id}
                    onClick={() => requestChange(adminChange(user))}
                  >
                    {user.is_moderator ? 'Odebrat práva admina' : 'Dát práva admina'}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && !users.loading && (
          <p className="text-text-muted text-sm">Žádný uživatel neodpovídá hledání.</p>
        )}
      </div>
    </div>
  )
}
