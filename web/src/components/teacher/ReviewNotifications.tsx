import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { Skeleton } from '../ui/Skeleton'
import { NavIcon } from '../layout/NavIcon'
import { NavBadge } from '../layout/NavBadge'
import { useQuery } from '../../lib/data/useQuery'
import { fetchPendingReview } from '../../lib/data/practiceLogs'
import { fetchStudents } from '../../lib/data/profiles'
import { fetchReviewSeenAt, markReviewSeen } from '../../lib/data/reviewSeen'
import { refreshNavBadges, useNavBadges } from '../../lib/navBadges'
import { getErrorMessage } from '../../lib/errors'

// "Oznámení": what the number on the Dashboard stands for - recordings sent
// since the teacher last marked them as read. "Označit jako přečtené" clears
// the number; the recordings stay in "Ke kontrole" to be graded.
function NotificationsList({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const pending = useQuery(() => fetchPendingReview(), [])
  const seenAt = useQuery(() => fetchReviewSeenAt().catch(() => null), [])
  const students = useQuery(() => fetchStudents(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const loading = pending.data === undefined || seenAt.data === undefined
  const seen = seenAt.data ? Date.parse(seenAt.data) : 0
  const fresh = (pending.data ?? []).filter((log) => Date.parse(log.created_at) > seen).reverse()
  const nameFor = (id: string) => students.data?.find((s) => s.id === id)?.full_name ?? 'Žák'

  async function markRead() {
    setBusy(true)
    setError(undefined)
    try {
      await markReviewSeen()
      refreshNavBadges()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-lg">Oznámení</h2>
      {loading && <Skeleton rows={2} />}
      {!loading && fresh.length === 0 && <p className="text-sm text-text-muted">Žádná nová oznámení.</p>}
      {fresh.length > 0 && (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {fresh.map((log) => (
            <li key={log.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl bg-bg-card-alt px-3 py-2 text-left"
                onClick={() => {
                  onClose()
                  navigate('/teacher/grading', { state: { studentId: log.user_id, logId: String(log.id) } })
                }}
              >
                <Avatar name={nameFor(log.user_id)} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-heading font-semibold">{nameFor(log.user_id)}</span>
                  <span className="block text-xs text-text-muted">
                    Nová nahrávka ke kontrole · {new Date(log.created_at).toLocaleString('cs-CZ')}
                  </span>
                </span>
                <span aria-hidden className="text-text-muted">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-text-muted">
        „Označit jako přečtené“ jen schová číslo. Nahrávky zůstanou v „Ke kontrole“, dokud je neohodnotíš.
      </p>
      {error && <p className="text-sm text-coral-dark">{error}</p>}
      <div className="flex gap-2.5">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Zavřít
        </Button>
        <Button className="flex-1" disabled={busy || fresh.length === 0} onClick={() => void markRead()}>
          Označit jako přečtené
        </Button>
      </div>
    </div>
  )
}

export function ReviewNotificationsButton() {
  const [open, setOpen] = useState(false)
  const badges = useNavBadges(['pending-review'])
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-heading font-semibold text-text-primary hover:bg-bg-card-alt"
      >
        <NavIcon name="bell" className="h-4 w-4" />
        Oznámení
        <NavBadge count={badges['pending-review']} label="nových oznámení" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        {open && <NotificationsList onClose={() => setOpen(false)} />}
      </Modal>
    </>
  )
}
