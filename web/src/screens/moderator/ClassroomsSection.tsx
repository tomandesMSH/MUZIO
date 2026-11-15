import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PasswordReauthModal } from '../../components/ui/PasswordReauthModal'
import { SearchBar } from '../../components/ui/SearchBar'
import { Toast } from '../../components/ui/Toast'
import { useQuery } from '../../lib/data/useQuery'
import { fetchAllUsers } from '../../lib/data/profiles'
import {
  deleteClassroomAsAdmin,
  fetchAllClassroomMembers,
  fetchAllClassrooms,
  moveStudent,
  transferClassroom,
} from '../../lib/data/adminClassrooms'
import { isReauthed } from '../../lib/reauth'
import { useToast } from '../../lib/useToast'
import { getErrorMessage } from '../../lib/errors'
import type { Classroom } from '../../lib/data/types'

const selectClass =
  'rounded-lg bg-bg-card-alt shadow-clay-press px-2 py-1.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-coral max-w-full'

// Every teacher's classes (migration 0031): who teaches it, its join code and
// pupils; move a pupil, add one, hand the class over, delete it.
export function ClassroomsSection() {
  const classrooms = useQuery(() => fetchAllClassrooms(), [])
  const members = useQuery(() => fetchAllClassroomMembers(), [])
  const users = useQuery(() => fetchAllUsers(), [])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Classroom>()
  const [reauthOpen, setReauthOpen] = useState(false)
  const { message, show } = useToast()

  const people = users.data ?? []
  const nameOf = (id: string) => people.find((u) => u.id === id)?.full_name ?? 'Neznámý účet'
  const pupils = people.filter((u) => u.role === 'student').sort((a, b) => a.full_name.localeCompare(b.full_name, 'cs'))
  const teachers = people
    .filter((u) => u.role === 'teacher' && u.is_verified)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'cs'))
  const all = classrooms.data ?? []
  const membersOf = (classroomId: string) =>
    (members.data ?? [])
      .filter((m) => m.classroom_id === classroomId)
      .map((m) => m.student_id)
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'cs'))

  const query = search.trim().toLowerCase()
  const visible = all.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query) ||
      nameOf(c.teacher_id).toLowerCase().includes(query) ||
      membersOf(c.id).some((id) => nameOf(id).toLowerCase().includes(query)),
  )

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true)
    try {
      await action()
      show(success)
      classrooms.refetch()
      members.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(false)
    }
  }

  function requestDelete(classroom: Classroom) {
    setDeleteTarget(classroom)
    if (!isReauthed()) setReauthOpen(true)
  }

  const loading = classrooms.loading || members.loading || users.loading
  const error = classrooms.error ?? members.error ?? users.error

  return (
    <div className="space-y-3">
      {message && <Toast message={message} />}
      <PasswordReauthModal
        open={reauthOpen}
        onCancel={() => {
          setReauthOpen(false)
          setDeleteTarget(undefined)
        }}
        onSuccess={() => setReauthOpen(false)}
      />
      <ConfirmDialog
        open={!reauthOpen && !!deleteTarget}
        title="Smazat třídu?"
        message={
          deleteTarget
            ? `Třída „${deleteTarget.name}“ se smaže i s úkoly a jejich přílohami. Žáci a jejich nahrávky zůstanou, jen bez úkolu.`
            : undefined
        }
        confirmLabel="Smazat třídu"
        onConfirm={() => {
          const target = deleteTarget
          setDeleteTarget(undefined)
          if (target) void run(() => deleteClassroomAsAdmin(target.id), `Třída „${target.name}“ byla smazána`)
        }}
        onCancel={() => setDeleteTarget(undefined)}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Hledat třídu, učitele nebo žáka" />
      {loading && <p className="text-text-muted text-sm">Načítám…</p>}
      {error && (
        <p className="text-sm text-coral-dark">Načtení se nepovedlo: {error.message}. Je spuštěná migrace 0031?</p>
      )}
      {!loading && all.length === 0 && <p className="text-text-muted text-sm">Zatím žádné třídy.</p>}

      <div className="space-y-2">
        {visible.map((classroom) => {
          const ids = membersOf(classroom.id)
          const isOpen = open === classroom.id
          const addable = pupils.filter((p) => !ids.includes(p.id))
          return (
            <div key={classroom.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2.5">
              <button
                className="w-full flex items-center justify-between gap-2 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? undefined : classroom.id)}
              >
                <div className="min-w-0">
                  <div className="font-heading font-semibold text-sm truncate">{classroom.name}</div>
                  <div className="text-text-muted text-xs truncate">
                    {nameOf(classroom.teacher_id)} · kód <span className="font-mono">{classroom.join_code}</span> ·{' '}
                    {ids.length} {ids.length === 1 ? 'žák' : ids.length >= 2 && ids.length <= 4 ? 'žáci' : 'žáků'}
                  </div>
                </div>
                <span className="text-text-muted text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-border pt-2.5">
                  <ul className="space-y-1.5">
                    {ids.map((studentId) => (
                      <li key={studentId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{nameOf(studentId)}</span>
                        <select
                          className={selectClass}
                          aria-label={`Přesunout: ${nameOf(studentId)}`}
                          disabled={busy}
                          value=""
                          onChange={(e) => {
                            const to = e.target.value === 'remove' ? null : e.target.value
                            const toName = all.find((c) => c.id === to)?.name
                            void run(
                              () => moveStudent(studentId, classroom.id, to),
                              to ? `Přesunuto do „${toName}“` : 'Odebráno ze třídy',
                            )
                          }}
                        >
                          <option value="">Přesunout…</option>
                          {all
                            .filter((c) => c.id !== classroom.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                do {c.name} ({nameOf(c.teacher_id)})
                              </option>
                            ))}
                          <option value="remove">Odebrat ze třídy</option>
                        </select>
                      </li>
                    ))}
                    {ids.length === 0 && <li className="text-text-muted text-xs">Ve třídě nikdo není.</li>}
                  </ul>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={selectClass}
                      aria-label={`Přidat žáka do ${classroom.name}`}
                      disabled={busy || addable.length === 0}
                      value=""
                      onChange={(e) =>
                        void run(() => moveStudent(e.target.value, null, classroom.id), 'Žák přidán do třídy')
                      }
                    >
                      <option value="">+ Přidat žáka…</option>
                      {addable.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={selectClass}
                      aria-label={`Předat třídu ${classroom.name}`}
                      disabled={busy}
                      value=""
                      onChange={(e) => {
                        const teacher = e.target.value
                        void run(() => transferClassroom(classroom.id, teacher), `Třída předána: ${nameOf(teacher)}`)
                      }}
                    >
                      <option value="">Předat učiteli…</option>
                      {teachers
                        .filter((t) => t.id !== classroom.teacher_id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="destructive"
                      className="!px-3 !py-1.5 text-xs"
                      disabled={busy}
                      onClick={() => requestDelete(classroom)}
                    >
                      Smazat třídu
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
