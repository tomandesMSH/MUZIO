import { useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { Toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { AppShell } from '../../components/layout/AppShell'
import { NewAssignmentModal } from '../../components/classrooms/NewAssignmentModal'
import { AssignmentProgress } from '../../components/classrooms/AssignmentProgress'
import { EditAssignmentModal } from '../../components/classrooms/EditAssignmentModal'
import { CopyAssignmentModal, type CopyAssignmentInput } from '../../components/classrooms/CopyAssignmentModal'
import { fetchAssignmentProgress } from '../../lib/data/practiceLogs'
import { daysUntil } from '../../lib/dueDate'
import { AttachmentLink } from '../../components/lessons/AttachmentLink'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  type AssignmentUpdate,
  createClassroom,
  deleteClassroom,
  fetchClassroomAssignments,
  fetchClassroomMemberIds,
  fetchTeacherClassrooms,
  removeClassroomMember,
} from '../../lib/data/classrooms'
import { fetchProfilesByIds } from '../../lib/data/profiles'
import { ClassAnnouncements } from '../../components/classrooms/ClassAnnouncements'
import { useToast } from '../../lib/useToast'
import { getErrorMessage } from '../../lib/errors'
import type { Assignment, Classroom } from '../../lib/data/types'

export function Classrooms() {
  const { profile } = useAuth()
  const classrooms = useQuery(() => (profile ? fetchTeacherClassrooms(profile.id) : Promise.resolve([])), [
    profile?.id,
  ])
  const [selected, setSelected] = useState<Classroom>()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const { message, show } = useToast()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !newName.trim()) return
    setCreating(true)
    try {
      await createClassroom(profile.id, newName.trim())
      setNewName('')
      classrooms.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Vytvoření třídy se nepovedlo.'))
    } finally {
      setCreating(false)
    }
  }

  if (selected) {
    return (
      <ClassroomDetail
        classroom={selected}
        allClassrooms={classrooms.data ?? [selected]}
        onBack={() => setSelected(undefined)}
        onDeleted={() => {
          setSelected(undefined)
          classrooms.refetch()
        }}
      />
    )
  }

  return (
    <AppShell role="teacher">
      {message && <Toast message={message} />}
      <div className="space-y-4 flex-1">
        <h1 className="text-xl">Učebny</h1>
        <form className="flex gap-2" onSubmit={handleCreate}>
          <Input placeholder="Název třídy (např. 3.A)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button type="submit" disabled={creating || !newName.trim()} className="shrink-0">
            Vytvořit
          </Button>
        </form>
        {classrooms.loading && !classrooms.data && <Skeleton rows={2} height="h-20" />}
        {classrooms.data?.length === 0 && (
          <p className="text-text-muted text-sm">Zatím žádná třída - vytvoř první výše.</p>
        )}
        <div className="space-y-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
          {classrooms.data?.map((classroom) => (
            <button
              key={classroom.id}
              className="w-full text-left rounded-2xl bg-bg-card shadow-clay-sm p-4"
              onClick={() => setSelected(classroom)}
            >
              <div className="font-heading font-semibold text-sm mb-1">{classroom.name}</div>
              <div className="text-text-muted text-xs">
                Kód: <span className="font-heading font-bold tracking-widest">{classroom.join_code}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

function ClassroomDetail({
  classroom,
  allClassrooms,
  onBack,
  onDeleted,
}: {
  classroom: Classroom
  allClassrooms: Classroom[]
  onBack: () => void
  onDeleted: () => void
}) {
  const memberIds = useQuery(() => fetchClassroomMemberIds(classroom.id), [classroom.id])
  const members = useQuery(
    () => (memberIds.data ? fetchProfilesByIds(memberIds.data) : Promise.resolve([])),
    [memberIds.data?.join(',')],
  )
  const assignments = useQuery(() => fetchClassroomAssignments(classroom.id), [classroom.id])
  const progress = useQuery(
    () => fetchAssignmentProgress((assignments.data ?? []).map((a) => a.id)),
    [assignments.data?.map((a) => a.id).join(',')],
  )
  const today = new Date()
  const { profile } = useAuth()
  const { message, show } = useToast()
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string>()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editing, setEditing] = useState<Assignment>()
  const [copying, setCopying] = useState<Assignment>()
  const [removing, setRemoving] = useState<Assignment>()
  const [copySubmitting, setCopySubmitting] = useState(false)
  const [copyError, setCopyError] = useState<string>()
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string>()
  const [deleting, setDeleting] = useState(false)

  const canDelete = !!profile && (profile.id === classroom.teacher_id || profile.role === 'moderator' || profile.is_moderator)

  async function handleDeleteClassroom() {
    setDeleteConfirmOpen(false)
    setDeleting(true)
    try {
      await deleteClassroom(classroom.id)
      onDeleted()
    } catch (err) {
      show(getErrorMessage(err, 'Smazání třídy se nepovedlo.'))
      setDeleting(false)
    }
  }

  async function handleCopyAssignment(input: CopyAssignmentInput) {
    if (!copying || !profile) return
    setCopySubmitting(true)
    setCopyError(undefined)
    try {
      await createAssignment({
        classroomId: input.classroomId,
        teacherId: profile.id,
        title: input.title.trim(),
        description: input.description,
        dueDate: input.dueDate,
        copyAttachmentFrom:
          input.withAttachment && copying.attachment_path && copying.attachment_name
            ? { path: copying.attachment_path, name: copying.attachment_name }
            : undefined,
      })
      setCopying(undefined)
      if (input.classroomId === classroom.id) assignments.refetch()
      show(`Zadáno třídě ${allClassrooms.find((c) => c.id === input.classroomId)?.name ?? ''}`.trim())
    } catch (err) {
      setCopyError(getErrorMessage(err, 'Zadání se nepovedlo.'))
    } finally {
      setCopySubmitting(false)
    }
  }

  async function handleDeleteAssignment() {
    const assignment = removing
    setRemoving(undefined)
    if (!assignment) return
    try {
      await deleteAssignment(assignment)
      assignments.refetch()
      show('Úkol smazán')
    } catch (err) {
      show(getErrorMessage(err, 'Úkol se nepodařilo smazat.'))
    }
  }

  async function handleEditAssignment(update: AssignmentUpdate) {
    if (!editing) return
    setEditSubmitting(true)
    setEditError(undefined)
    try {
      await updateAssignment(editing, update)
      setEditing(undefined)
      assignments.refetch()
      show('Úkol upraven')
    } catch (err) {
      setEditError(getErrorMessage(err, 'Úpravu se nepodařilo uložit.'))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleCreateAssignment(input: {
    title: string
    description: string
    recipientIds: string[]
    attachment: File | null
    dueDate: string
  }) {
    if (!profile) return
    setAssignmentSubmitting(true)
    setAssignmentError(undefined)
    try {
      await createAssignment({
        classroomId: classroom.id,
        teacherId: profile.id,
        title: input.title,
        description: input.description,
        recipientIds: input.recipientIds,
        attachment: input.attachment,
        dueDate: input.dueDate,
      })
      setAssignmentOpen(false)
      assignments.refetch()
    } catch (err) {
      setAssignmentError(getErrorMessage(err, 'Zadání úkolu se nepovedlo.'))
    } finally {
      setAssignmentSubmitting(false)
    }
  }

  async function handleRemoveMember(studentId: string) {
    try {
      await removeClassroomMember(classroom.id, studentId)
      memberIds.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Odebrání se nepovedlo.'))
    }
  }

  return (
    <AppShell role="teacher">
      {message && <Toast message={message} />}
      <div className="space-y-4 flex-1">
        <button className="text-sm text-text-muted" onClick={onBack}>
          ← Zpět na třídy
        </button>
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <h1 className="text-xl">{classroom.name}</h1>
            <p className="text-text-muted text-sm">
              Kód pro připojení: <span className="font-heading font-bold tracking-widest">{classroom.join_code}</span>
            </p>
          </div>
          {canDelete && (
            <Button
              variant="destructive"
              className="shrink-0 !px-3 !py-1.5 text-xs"
              disabled={deleting}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Smazat třídu
            </Button>
          )}
        </div>

        {profile && profile.id === classroom.teacher_id && (
          <ClassAnnouncements classroomId={classroom.id} teacherId={profile.id} />
        )}

        <div>
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">Žáci ({members.data?.length ?? 0})</h2>
          <div className="space-y-2">
            {members.data?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2.5 rounded-2xl bg-bg-card shadow-clay-sm p-3"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={member.full_name} size={34} />
                  <span className="text-sm font-heading font-semibold">{member.full_name}</span>
                </div>
                <button
                  className="text-xs text-coral-dark"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  Odebrat
                </button>
              </div>
            ))}
            {members.data?.length === 0 && (
              <p className="text-text-muted text-sm">Zatím se nikdo nepřipojil - sdílej kód výše.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-heading font-semibold text-text-muted">Úkoly</h2>
            <Button className="!px-3 !py-1.5 text-xs" onClick={() => setAssignmentOpen(true)}>
              + Zadat úkol
            </Button>
          </div>
          <div className="space-y-2">
            {assignments.data?.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-heading font-semibold text-sm min-w-0 break-words">{assignment.title}</div>
                  {assignment.due_date && (
                    <div
                      className={`shrink-0 text-xs ${daysUntil(assignment.due_date, today) < 0 ? 'text-text-muted' : 'text-coral font-semibold'}`}
                    >
                      Termín {new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                    </div>
                  )}
                </div>
                {assignment.attachment_path && (
                  <div className="mt-1.5">
                    <AttachmentLink assignment={assignment} forTeacher />
                  </div>
                )}
                {assignment.description && (
                  <div className="text-text-muted text-xs mt-1">{assignment.description}</div>
                )}
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    className="text-text-muted underline underline-offset-2 hover:text-text-primary"
                    onClick={() => {
                      setEditError(undefined)
                      setEditing(assignment)
                    }}
                  >
                    Upravit
                  </button>
                  <button
                    type="button"
                    className="text-text-muted underline underline-offset-2 hover:text-text-primary"
                    onClick={() => {
                      setCopyError(undefined)
                      setCopying(assignment)
                    }}
                  >
                    Zadat znovu
                  </button>
                  <button
                    type="button"
                    className="ml-auto text-coral-dark underline underline-offset-2"
                    onClick={() => setRemoving(assignment)}
                  >
                    Smazat
                  </button>
                </div>
                {progress.data && members.data && (
                  <AssignmentProgress
                    pupils={(() => {
                      const chosen = progress.data.recipients.get(assignment.id)
                      return chosen ? members.data.filter((m) => chosen.includes(m.id)) : members.data
                    })()}
                    submitted={progress.data.submitted.get(assignment.id) ?? new Set()}
                  />
                )}
              </div>
            ))}
            {assignments.data?.length === 0 && <p className="text-text-muted text-sm">Zatím žádné úkoly.</p>}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!removing}
        title={`Smazat úkol „${removing?.title ?? ''}“?`}
        message="Žáci ho přestanou vidět. Nahrávky, které k němu poslali, jim zůstanou i s hodnocením."
        confirmLabel="Smazat úkol"
        onConfirm={() => void handleDeleteAssignment()}
        onCancel={() => setRemoving(undefined)}
      />
      {copying && (
        <CopyAssignmentModal
          assignment={copying}
          classrooms={allClassrooms}
          submitting={copySubmitting}
          error={copyError}
          onClose={() => setCopying(undefined)}
          onSubmit={(input) => void handleCopyAssignment(input)}
        />
      )}
      {editing && (
        <EditAssignmentModal
          assignment={editing}
          submitting={editSubmitting}
          error={editError}
          onClose={() => setEditing(undefined)}
          onSubmit={(update) => void handleEditAssignment(update)}
        />
      )}
      <NewAssignmentModal
        open={assignmentOpen}
        members={members.data ?? []}
        submitting={assignmentSubmitting}
        error={assignmentError}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={handleCreateAssignment}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Smazat třídu?"
        message={`Nenávratně smažeš třídu „${classroom.name}“ včetně všech úkolů. Žáci o třídu přijdou, jejich nahrávky a profily zůstanou zachovány.`}
        confirmLabel="Smazat"
        onConfirm={handleDeleteClassroom}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </AppShell>
  )
}
