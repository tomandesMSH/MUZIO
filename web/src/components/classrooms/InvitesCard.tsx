import { useState } from 'react'
import { Button } from '../ui/Button'
import { useQuery } from '../../lib/data/useQuery'
import { fetchMyInvites, respondToInvite } from '../../lib/data/classroomInvites'
import { getErrorMessage } from '../../lib/errors'

// The pupil's invitations into a class (migration 0062), on the dashboard and
// in Třídy. Nothing shows without one.
export function InvitesCard({ onJoined }: { onJoined?: () => void }) {
  const invites = useQuery(() => fetchMyInvites(), [])
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [joined, setJoined] = useState<string>()

  async function respond(id: string, accept: boolean, name: string) {
    setBusy(id)
    setError(undefined)
    try {
      await respondToInvite(id, accept)
      if (accept) {
        setJoined(name)
        onJoined?.()
      }
      invites.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(undefined)
    }
  }

  if (!invites.data?.length && !joined) return null
  return (
    <div className="space-y-2">
      {joined && <p className="text-sm font-heading font-semibold">Jsi ve třídě „{joined}“ 🎉</p>}
      {invites.data?.map((invite) => (
        <div key={invite.id} className="rounded-2xl bg-coral-tint p-4 space-y-3">
          <div>
            <div className="font-heading font-semibold text-coral-dark">Pozvánka do třídy „{invite.classroom_name}“</div>
            <div className="text-xs text-text-muted">
              {invite.teacher_name ?? 'Učitel'} tě zve do své třídy. Uvidíš v ní úkoly a oznámení.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 !py-2 text-sm"
              disabled={busy === invite.id}
              onClick={() => void respond(invite.id, true, invite.classroom_name)}
            >
              Přijmout
            </Button>
            <Button
              variant="ghost"
              className="flex-1 !py-2 text-sm"
              disabled={busy === invite.id}
              onClick={() => void respond(invite.id, false, invite.classroom_name)}
            >
              Odmítnout
            </Button>
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-coral-dark">{error}</p>}
    </div>
  )
}
