import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useQuery } from '../../lib/data/useQuery'
import { addTeacherDay, earliestTeacherDay, fetchTeacherDays, removeTeacherDay } from '../../lib/data/teacherDays'
import { toDateKey } from '../../lib/game-logic'
import { getErrorMessage } from '../../lib/errors'

// On the pupil card: the teacher adds a practice day without a recording
// (migration 0057). It counts as a flame. `onChanged` refreshes the flames.
export function TeacherDaysEditor({ studentId, onChanged }: { studentId: string; onChanged?: () => void }) {
  const days = useQuery(() => fetchTeacherDays(studentId), [studentId])
  const [today] = useState(() => toDateKey(new Date()))
  const [day, setDay] = useState(today)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      await addTeacherDay(studentId, day, note)
      setNote('')
      days.refetch()
      onChanged?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Den se nepovedlo připsat. Je spuštěná migrace 0057?'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(d: string) {
    setError(undefined)
    try {
      await removeTeacherDay(studentId, d)
      days.refetch()
      onChanged?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Odebrání se nepovedlo.'))
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={add} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2">
        <p className="text-[11px] text-text-muted">
          Žák cvičil, ale nahrávku neposlal (hrál v hodině, poslal video jinak)? Připiš mu den a dostane za něj plamínek.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <div className="text-xs font-semibold text-text-muted mb-1">Den</div>
            <Input
              type="date"
              value={day}
              min={earliestTeacherDay()}
              max={today}
              onChange={(e) => setDay(e.target.value)}
              className="!w-auto"
              required
            />
          </label>
          <label className="block flex-1 min-w-40">
            <div className="text-xs font-semibold text-text-muted mb-1">Poznámka (nepovinná)</div>
            <Input value={note} maxLength={200} placeholder="např. hrál(a) v hodině" onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button type="submit" className="!px-4 !py-2 text-xs" disabled={busy || !day}>
            Připsat den
          </Button>
        </div>
        {error && <p className="text-xs text-coral-dark">{error}</p>}
      </form>
      {(days.data ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded-2xl bg-bg-card-alt px-3.5 text-sm">
          {(days.data ?? []).map((d) => (
            <li key={d.day} className="flex items-center justify-between gap-2 py-2">
              <span>
                {new Date(`${d.day}T12:00:00`).toLocaleDateString('cs-CZ')}
                {d.note && <span className="text-text-muted"> · {d.note}</span>}
              </span>
              <button type="button" className="text-xs text-coral-dark" onClick={() => remove(d.day)}>
                Odebrat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
