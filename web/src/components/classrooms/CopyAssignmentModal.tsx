import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { DueDateField } from './DueDateField'
import type { Assignment, Classroom } from '../../lib/data/types'

export interface CopyAssignmentInput {
  classroomId: string
  title: string
  description: string
  dueDate: string
  withAttachment: boolean
}

interface CopyAssignmentModalProps {
  assignment: Assignment
  classrooms: Classroom[]
  submitting: boolean
  error?: string
  onClose: () => void
  onSubmit: (input: CopyAssignmentInput) => void
}

// "Zadat znovu": the same task again - to another class, or to this one next
// week - without typing it out. Goes to the whole chosen class.
// Mount only while open.
export function CopyAssignmentModal({ assignment, classrooms, submitting, error, onClose, onSubmit }: CopyAssignmentModalProps) {
  const [classroomId, setClassroomId] = useState(assignment.classroom_id)
  const [title, setTitle] = useState(assignment.title)
  const [description, setDescription] = useState(assignment.description ?? '')
  const [dueDate, setDueDate] = useState('')
  const [withAttachment, setWithAttachment] = useState(true)

  return (
    <Modal open onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit({ classroomId, title, description, dueDate, withAttachment: withAttachment && !!assignment.attachment_path })
        }}
      >
        <h2 className="font-heading font-semibold text-lg">Zadat znovu</h2>
        <div>
          <div className="text-xs font-semibold text-text-muted mb-1.5">Které třídě</div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Třída">
            {classrooms.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === classroomId}
                onClick={() => setClassroomId(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-heading font-semibold transition ${
                  c.id === classroomId ? 'bg-coral text-white shadow-clay-sm' : 'bg-bg-card-alt text-text-muted hover:text-text-primary'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Úkol dostane celá třída.</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-text-muted mb-1.5">Nadpis</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required aria-label="Nadpis" />
        </div>
        <div>
          <div className="text-xs font-semibold text-text-muted mb-1.5">Popis</div>
          <textarea
            aria-label="Popis"
            className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DueDateField value={dueDate} onChange={setDueDate} />
        {assignment.attachment_path && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withAttachment} onChange={(e) => setWithAttachment(e.target.checked)} className="accent-coral" />
            Přiložit stejné noty ({assignment.attachment_name})
          </label>
        )}
        {error && <p className="text-sm text-coral-dark">{error}</p>}
        <div className="flex gap-2.5">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting || !title.trim()}>
            Zadat
          </Button>
        </div>
      </form>
    </Modal>
  )
}
