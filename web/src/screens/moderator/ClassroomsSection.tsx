import { useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { PickerMenu } from '../../components/ui/PickerMenu'
import { Chevron, Collapse } from '../../components/ui/Collapse'
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

const REMOVE = '__remove__'

interface PendingAction {
  title: string
  message: string
  confirmLabel: string
  run: () => Promise<void>
  success: string
}

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
  const [confirm, setConfirm] = useState<PendingAction>()
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

  // "3.A, 4.B" - shown next to a pupil you're about to add.
  const classesOf = (studentId: string) =>
    all
      .filter((c) => (members.data ?? []).some((m) => m.classroom_id === c.id && m.student_id === studentId))
      .map((c) => c.name)
      .join(', ')

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

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={() => {
          const action = confirm
          setConfirm(undefined)
          if (action) void run(action.run, action.success)
        }}
        onCancel={() => setConfirm(undefined)}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Hledat třídu, učitele nebo žáka" />
      {loading && <Skeleton rows={3} height="h-20" />}
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
            <div key={classroom.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5">
              <button
                className="w-full flex items-center justify-between gap-2 text-left"
                aria-expanded={isOpen}
                aria-controls={`trida-${classroom.id}`}
                onClick={() => setOpen(isOpen ? undefined : classroom.id)}
              >
                <div className="min-w-0">
                  <div className="font-heading font-semibold text-sm truncate">{classroom.name}</div>
                  <div className="text-text-muted text-xs truncate">
                    {nameOf(classroom.teacher_id)} · kód <span className="font-mono">{classroom.join_code}</span> ·{' '}
                    {ids.length} {ids.length === 1 ? 'žák' : ids.length >= 2 && ids.length <= 4 ? 'žáci' : 'žáků'}
                  </div>
                </div>
                <span className="shrink-0">
                  <Chevron open={isOpen} />
                </span>
              </button>

              <Collapse open={isOpen} id={`trida-${classroom.id}`}>
                <div className="mt-2.5 space-y-3 border-t border-border pt-2.5">
                  <ul className="space-y-1.5">
                    {ids.map((studentId) => (
                      <li key={studentId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{nameOf(studentId)}</span>
                        <PickerMenu
                          label="Přesunout"
                          ariaLabel={`Přesunout: ${nameOf(studentId)}`}
                          disabled={busy}
                          options={[
                            ...all
                              .filter((c) => c.id !== classroom.id)
                              .map((c) => ({ value: c.id, label: c.name, hint: nameOf(c.teacher_id) })),
                            { value: REMOVE, label: 'Odebrat ze třídy', danger: true },
                          ]}
                          onPick={(value) => {
                            const to = value === REMOVE ? null : value
                            const toName = all.find((c) => c.id === to)?.name
                            setConfirm({
                              title: to ? 'Přesunout žáka?' : 'Odebrat žáka ze třídy?',
                              message: to
                                ? `„${nameOf(studentId)}“ odejde ze třídy „${classroom.name}“ do „${toName}“.`
                                : `„${nameOf(studentId)}“ odejde ze třídy „${classroom.name}“. Účet i nahrávky mu zůstanou.`,
                              confirmLabel: to ? 'Přesunout' : 'Odebrat',
                              run: () => moveStudent(studentId, classroom.id, to),
                              success: to ? `Přesunuto do „${toName}“` : 'Odebráno ze třídy',
                            })
                          }}
                        />
                      </li>
                    ))}
                    {ids.length === 0 && <li className="text-text-muted text-xs">Ve třídě nikdo není.</li>}
                  </ul>

                  <div className="flex flex-wrap items-center gap-2">
                    <PickerMenu
                      label="+ Přidat žáka"
                      ariaLabel={`Přidat žáka do ${classroom.name}`}
                      disabled={busy}
                      emptyText="Všichni žáci už ve třídě jsou."
                      searchPlaceholder="Hledat žáka…"
                      options={addable.map((p) => ({
                        value: p.id,
                        label: p.full_name,
                        hint: classesOf(p.id) || undefined,
                      }))}
                      onPick={(studentId) =>
                        void run(() => moveStudent(studentId, null, classroom.id), `${nameOf(studentId)} přidán(a) do třídy`)
                      }
                    />
                    <PickerMenu
                      label="Předat učiteli"
                      ariaLabel={`Předat třídu ${classroom.name}`}
                      disabled={busy}
                      emptyText="Žádný jiný ověřený učitel."
                      searchPlaceholder="Hledat učitele…"
                      options={teachers
                        .filter((t) => t.id !== classroom.teacher_id)
                        .map((t) => ({ value: t.id, label: t.full_name }))}
                      onPick={(teacherId) =>
                        setConfirm({
                          title: 'Předat třídu?',
                          message: `Třída „${classroom.name}“ i s úkoly přejde od „${nameOf(classroom.teacher_id)}“ k „${nameOf(teacherId)}“. Původní učitel ji už neuvidí.`,
                          confirmLabel: 'Předat',
                          run: () => transferClassroom(classroom.id, teacherId),
                          success: `Třída předána: ${nameOf(teacherId)}`,
                        })
                      }
                    />
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
              </Collapse>
            </div>
          )
        })}
      </div>
    </div>
  )
}
