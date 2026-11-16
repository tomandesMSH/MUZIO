import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/AuthProvider'
import { NOTE_MAX, fetchTeacherNote, saveTeacherNote } from '../../lib/data/teacherNotes'

const SAVE_AFTER_MS = 1000

type Status = 'loading' | 'unavailable' | 'idle' | 'saving' | 'saved' | 'error'

// The teacher's private notes about a pupil, saved as they type (a second
// after the last key, and when leaving). Without migration 0040 it says so.
export function StudentNotes({ studentId, autoFocus }: { studentId: string; autoFocus?: boolean }) {
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Status>('loading')
  const [updatedAt, setUpdatedAt] = useState<string>()
  // What still needs saving (also flushed when the notes close).
  const unsaved = useRef<string>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const teacherId = profile?.id

  useEffect(() => {
    if (!teacherId) return
    let current = true
    fetchTeacherNote(teacherId, studentId)
      .then((note) => {
        if (!current) return
        setBody(note?.body ?? '')
        setUpdatedAt(note?.updated_at)
        setStatus('idle')
      })
      .catch(() => current && setStatus('unavailable'))
    return () => {
      current = false
    }
  }, [teacherId, studentId])

  // Leaving with something unsaved: save it now.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (teacherId && unsaved.current !== undefined) void saveTeacherNote(teacherId, studentId, unsaved.current).catch(() => {})
    },
    [teacherId, studentId],
  )

  function save(text: string) {
    if (!teacherId) return
    setStatus('saving')
    saveTeacherNote(teacherId, studentId, text)
      .then(() => {
        if (unsaved.current === text) unsaved.current = undefined
        setUpdatedAt(new Date().toISOString())
        setStatus('saved')
      })
      .catch(() => setStatus('error'))
  }

  function change(text: string) {
    setBody(text)
    unsaved.current = text
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(text), SAVE_AFTER_MS)
  }

  if (status === 'loading') return <p className="text-xs text-text-muted">Načítám poznámky…</p>
  if (status === 'unavailable') {
    return <p className="text-xs text-text-muted">Poznámky zatím nejdou načíst. Zkus to později.</p>
  }

  return (
    <div className="space-y-1">
      <textarea
        aria-label="Moje poznámky k žákovi"
        autoFocus={autoFocus}
        className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
        rows={4}
        maxLength={NOTE_MAX}
        placeholder="Co probrat příště, na co si dát pozor… Žák to neuvidí."
        value={body}
        onChange={(e) => change(e.target.value)}
        onBlur={() => {
          if (unsaved.current !== undefined) {
            clearTimeout(timer.current)
            save(unsaved.current)
          }
        }}
      />
      <div className="flex justify-between gap-2 text-[11px] text-text-muted" aria-live="polite">
        <span>🔒 Vidíš jen ty.</span>
        <span>
          {status === 'saving'
            ? 'Ukládám…'
            : status === 'error'
              ? 'Neuloženo – zkontroluj připojení'
              : status === 'saved'
                ? 'Uloženo ✓'
                : updatedAt
                  ? `Upraveno ${new Date(updatedAt).toLocaleDateString('cs-CZ')}`
                  : ''}
        </span>
      </div>
    </div>
  )
}
