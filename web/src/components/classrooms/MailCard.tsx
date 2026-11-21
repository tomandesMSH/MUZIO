import { useState } from 'react'
import { useQuery } from '../../lib/data/useQuery'
import { fetchMyMessages, markMessageRead } from '../../lib/data/pupilMessages'
import { fetchMyTeacherNames } from '../../lib/data/classrooms'
import { refreshNavBadges } from '../../lib/navBadges'

// Hudební pošta on the pupil's dashboard: messages from their teachers,
// unread on top. Nothing shows without any (or before migration 0052).
export function MailCard({ studentId }: { studentId: string }) {
  const messages = useQuery(() => fetchMyMessages(studentId).catch(() => []), [studentId])
  const teachers = useQuery(() => fetchMyTeacherNames(), [])
  const [readNow, setReadNow] = useState<Set<string>>(new Set())

  const list = [...(messages.data ?? [])].sort(
    (a, b) => Number(!!a.read_at) - Number(!!b.read_at) || b.created_at.localeCompare(a.created_at),
  )
  if (list.length === 0) return null

  async function read(id: string) {
    setReadNow(new Set(readNow).add(id))
    try {
      await markMessageRead(id)
      refreshNavBadges()
    } catch {
      // Stays unread on the server; marked again next time.
    }
  }

  return (
    <div>
      <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">Hudební pošta</h2>
      <div className="space-y-2">
        {list.map((m) => {
          const unread = !m.read_at && !readNow.has(m.id)
          return (
            <div
              key={m.id}
              className={`rounded-2xl bg-bg-card shadow-clay-sm p-3.5 ${unread ? 'border-l-4 border-coral' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2 text-xs text-text-muted">
                <span className="font-heading font-semibold text-text-primary">
                  {m.teacher_id ? (teachers.data?.get(m.teacher_id) ?? 'Učitel') : 'Z předchozí aplikace'}
                </span>
                <span className="shrink-0">{new Date(m.created_at).toLocaleDateString('cs-CZ')}</span>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap break-words">{m.body}</p>
              {unread && (
                <div className="mt-1.5 text-right">
                  <button type="button" className="text-xs font-heading font-semibold text-coral-dark" onClick={() => read(m.id)}>
                    Přečteno
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
