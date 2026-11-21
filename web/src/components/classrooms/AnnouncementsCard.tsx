import { useState } from 'react'
import { useQuery } from '../../lib/data/useQuery'
import { fetchMyAnnouncements } from '../../lib/data/announcements'
import { fetchMyTeacherNames } from '../../lib/data/classrooms'

const STORAGE_KEY = 'muzio-announcements-read'

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

// The pupil's Dashboard: announcements from their classes' teachers (last two
// weeks). "Rozumím" hides one on this device. Nothing shows without any.
export function AnnouncementsCard() {
  const list = useQuery(() => fetchMyAnnouncements().catch(() => []), [])
  const teachers = useQuery(() => fetchMyTeacherNames(), [])
  const [read, setRead] = useState(loadRead)

  const shown = (list.data ?? []).filter((a) => !read.has(a.id))
  if (shown.length === 0) return null

  function dismiss(id: string) {
    const next = new Set(read).add(id)
    setRead(next)
    try {
      // Only the recent ones need remembering.
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next].slice(-100)))
    } catch {
      // Not remembered - it shows again next time.
    }
  }

  return (
    <div className="space-y-2">
      {shown.map((a) => (
        <div key={a.id} className="rounded-2xl border-l-4 border-coral bg-bg-card shadow-clay-sm p-3.5" role="status">
          <div className="flex items-baseline justify-between gap-2 text-xs text-text-muted">
            <span className="font-heading font-semibold text-text-primary">
              {teachers.data?.get(a.teacher_id) ?? 'Oznámení'}
              {a.classroom_name ? ` · ${a.classroom_name}` : ''}
            </span>
            <span className="shrink-0">{new Date(a.created_at).toLocaleDateString('cs-CZ')}</span>
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{a.body}</p>
          <div className="mt-1.5 text-right">
            <button
              type="button"
              className="text-xs font-heading font-semibold text-coral-dark"
              onClick={() => dismiss(a.id)}
            >
              Rozumím
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
