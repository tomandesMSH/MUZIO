import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AttachmentField } from './AttachmentField'
import { DueDateField } from './DueDateField'
import { StarsRewardField } from './StarsRewardField'
import type { Assignment } from '../../lib/data/types'
import type { AssignmentUpdate } from '../../lib/data/classrooms'
import { NavIcon } from '../layout/NavIcon'

interface EditAssignmentModalProps {
  assignment: Assignment
  submitting: boolean
  error?: string
  onClose: () => void
  onSubmit: (update: AssignmentUpdate) => void
}

// "Upravit" on an assignment: fix the title or the description, move the
// deadline, swap or drop the score. Who it's for stays as it was.
// Mount only while open (fields start from the assignment).
export function EditAssignmentModal({ assignment, submitting, error, onClose, onSubmit }: EditAssignmentModalProps) {
  const [title, setTitle] = useState(assignment.title)
  const [description, setDescription] = useState(assignment.description ?? '')
  const [dueDate, setDueDate] = useState(assignment.due_date ?? '')
  const [starsReward, setStarsReward] = useState(assignment.stars_reward ?? 0)
  // The current file: kept, removed, or being replaced by a new one.
  const [fileMode, setFileMode] = useState<'keep' | 'remove' | 'replace'>('keep')
  const [newFile, setNewFile] = useState<File | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title,
      description,
      dueDate,
      starsReward,
      attachment:
        fileMode === 'replace' && newFile
          ? { kind: 'replace', file: newFile }
          : fileMode === 'remove'
            ? { kind: 'remove' }
            : { kind: 'keep' },
    })
  }

  const hasFile = !!assignment.attachment_path

  return (
    <Modal open onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-heading font-semibold text-lg">Upravit úkol</h2>
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
        <StarsRewardField value={starsReward} onChange={setStarsReward} />

        {hasFile && fileMode === 'keep' ? (
          <div>
            <div className="text-xs font-semibold text-text-muted mb-1.5">Noty pro Keyboard Utils</div>
            <div className="flex items-center gap-2 rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-2.5 text-sm">
              <NavIcon name="lessons" className="w-4 h-4 shrink-0 text-text-muted" />
              <span className="truncate flex-1">{assignment.attachment_name}</span>
              <button type="button" className="text-text-muted text-xs hover:text-text-primary" onClick={() => setFileMode('replace')}>
                Nahradit
              </button>
              <button type="button" className="text-text-muted text-xs hover:text-text-primary" onClick={() => setFileMode('remove')}>
                Odebrat
              </button>
            </div>
          </div>
        ) : hasFile && fileMode === 'remove' ? (
          <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
            <span>Noty „{assignment.attachment_name}“ se po uložení odeberou.</span>
            <button type="button" className="underline underline-offset-2" onClick={() => setFileMode('keep')}>
              Vrátit
            </button>
          </div>
        ) : (
          <div>
          {hasFile && (
            <button
              type="button"
              className="mb-1 text-xs text-text-muted underline underline-offset-2"
              onClick={() => {
                setNewFile(null)
                setFileMode('keep')
              }}
            >
              Ponechat původní noty
            </button>
          )}
          <AttachmentField
            file={newFile}
            onChange={(file) => {
              setNewFile(file)
              setFileMode(file ? 'replace' : hasFile ? 'replace' : 'keep')
            }}
          />
          </div>
        )}

        {error && <p className="text-sm text-coral-dark">{error}</p>}
        <div className="flex gap-2.5">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting || !title.trim() || (fileMode === 'replace' && hasFile && !newFile)}>
            Uložit
          </Button>
        </div>
      </form>
    </Modal>
  )
}
