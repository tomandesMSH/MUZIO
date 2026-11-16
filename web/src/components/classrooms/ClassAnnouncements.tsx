import { useState } from 'react'
import { Button } from '../ui/Button'
import { useQuery } from '../../lib/data/useQuery'
import {
  ANNOUNCEMENT_MAX,
  deleteAnnouncement,
  fetchClassAnnouncements,
  postAnnouncement,
} from '../../lib/data/announcements'
import { getErrorMessage } from '../../lib/errors'

// A class's announcements for the teacher: write one (the pupils get a
// notification and see it on their Dashboard for two weeks), see and delete
// the earlier ones. Hidden without migration 0041.
export function ClassAnnouncements({ classroomId, teacherId }: { classroomId: string; teacherId: string }) {
  const list = useQuery(() => fetchClassAnnouncements(classroomId), [classroomId])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>()

  if (list.error) return null

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setError(undefined)
    try {
      await postAnnouncement(classroomId, teacherId, body)
      setBody('')
      list.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Oznámení se nepodařilo odeslat.'))
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteAnnouncement(id)
      list.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Smazání se nepovedlo.'))
    }
  }

  return (
    <div>
      <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">📢 Oznámení pro třídu</h2>
      <form onSubmit={send} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2">
        <textarea
          aria-label="Text oznámení"
          className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
          rows={2}
          maxLength={ANNOUNCEMENT_MAX}
          placeholder="Např. V pátek je koncert v 17:00, přijďte v 16:30."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-muted">Žáci dostanou notifikaci a uvidí ho 14 dní na Dashboardu.</span>
          <Button type="submit" className="shrink-0 !px-4 !py-1.5 text-xs" disabled={sending || !body.trim()}>
            {sending ? 'Odesílám…' : 'Odeslat'}
          </Button>
        </div>
        {error && <p className="text-sm text-coral-dark">{error}</p>}
      </form>
      {(list.data ?? []).length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {(list.data ?? []).map((a) => (
            <li key={a.id} className="flex items-start gap-2 rounded-xl bg-bg-card-alt px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm whitespace-pre-wrap break-words">{a.body}</p>
                <p className="text-[11px] text-text-muted">{new Date(a.created_at).toLocaleString('cs-CZ')}</p>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs text-text-muted underline underline-offset-2 hover:text-coral-dark"
                onClick={() => void remove(a.id)}
              >
                Smazat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
