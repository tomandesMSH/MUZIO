import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { QrCode } from '../ui/QrCode'
import { useQuery } from '../../lib/data/useQuery'
import {
  cancelClassroomInvite,
  classroomLink,
  fetchSentInvites,
  inviteToClassroom,
  searchSchoolPupils,
  type PupilHit,
} from '../../lib/data/classroomInvites'
import { getErrorMessage } from '../../lib/errors'

// Učebny -> Žáci -> Pozvat: the class link (copy / share / the code big
// enough to project) and inviting a particular pupil of the school.
function InviteContent({ classroomId, classroomName, joinCode, onClose }: InviteModalProps) {
  const link = classroomLink(joinCode)
  const [copied, setCopied] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const sent = useQuery(() => fetchSentInvites(classroomId).catch(() => []), [classroomId])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])
  const hits = useQuery(
    () => (debounced.length >= 2 ? searchSchoolPupils(classroomId, debounced) : Promise.resolve([] as PupilHit[])),
    [classroomId, debounced],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Zkopírovat se nepovedlo. Označ odkaz a zkopíruj ho ručně.')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `Třída ${classroomName} v Muziu`, text: `Připoj se do třídy ${classroomName}:`, url: link })
    } catch {
      // Closed the share sheet - nothing to do.
    }
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    setError(undefined)
    try {
      await action()
      hits.refetch()
      sent.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-heading font-semibold text-lg">Pozvat do třídy {classroomName}</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-heading font-semibold">Odkaz do třídy</h3>
        <p className="text-xs text-text-muted">
          Kdo na odkaz klepne, je ve třídě. Kdo ještě nemá účet, nejdřív se zaregistruje.
        </p>
        <input
          readOnly
          value={link}
          aria-label="Odkaz do třídy"
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-3 py-2 text-xs text-text-primary outline-none"
        />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 !py-2 text-xs" onClick={() => void copy()}>
            {copied ? 'Zkopírováno ✓' : 'Kopírovat odkaz'}
          </Button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button variant="ghost" className="flex-1 !py-2 text-xs" onClick={() => void share()}>
              Sdílet
            </Button>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-bg-card-alt py-4 text-center sm:flex-row sm:justify-center sm:gap-6">
          <QrCode value={link} label={`QR kód: odkaz do třídy ${classroomName}`} className="h-40 w-40 rounded-lg" />
          <div>
            <div className="text-[11px] text-text-muted">Naskenuj telefonem, nebo zadej kód v Třídách</div>
            <div className="font-heading font-bold text-3xl tracking-[0.3em]">{joinCode}</div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-heading font-semibold">Pozvat žáka</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jméno žáka (aspoň 2 písmena)"
          aria-label="Hledat žáka"
          className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
        />
        {debounced.length >= 2 && hits.data?.length === 0 && (
          <p className="text-xs text-text-muted">Nikoho takového nenacházím.</p>
        )}
        {hits.error && <p className="text-xs text-coral-dark">Hledání se nepovedlo: {hits.error.message}</p>}
        <ul className="max-h-56 space-y-1.5 overflow-y-auto">
          {(hits.data ?? []).map((pupil) => (
            <li key={pupil.id} className="flex items-center gap-2.5 rounded-xl bg-bg-card-alt px-3 py-2">
              <Avatar name={pupil.full_name} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm">{pupil.full_name}</span>
              {pupil.is_member ? (
                <span className="text-xs text-text-muted">ve třídě</span>
              ) : pupil.is_invited ? (
                <span className="text-xs text-text-muted">pozváno</span>
              ) : (
                <Button
                  className="!px-3 !py-1 text-xs"
                  disabled={busy === pupil.id}
                  onClick={() => void run(pupil.id, () => inviteToClassroom(classroomId, pupil.id))}
                >
                  Pozvat
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted">Žák pozvánku uvidí na nástěnce a sám ji přijme.</p>
      </section>

      {(sent.data?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-heading font-semibold">Čeká na přijetí ({sent.data?.length})</h3>
          <ul className="space-y-1.5">
            {sent.data?.map((invite) => (
              <li key={invite.id} className="flex items-center gap-2.5 rounded-xl bg-bg-card-alt px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{invite.full_name}</span>
                <span className="text-[11px] text-text-muted">{new Date(invite.created_at).toLocaleDateString('cs-CZ')}</span>
                <button
                  type="button"
                  className="text-xs text-coral-dark disabled:opacity-40"
                  disabled={busy === invite.id}
                  onClick={() => void run(invite.id, () => cancelClassroomInvite(invite.id))}
                >
                  Zrušit
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="text-sm text-coral-dark">{error}</p>}
      <Button variant="ghost" className="w-full" onClick={onClose}>
        Hotovo
      </Button>
    </div>
  )
}

interface InviteModalProps {
  classroomId: string
  classroomName: string
  joinCode: string
  onClose: () => void
}

export function InviteModal({ open, ...props }: InviteModalProps & { open: boolean }) {
  return (
    <Modal open={open} onClose={props.onClose}>
      {open && <InviteContent {...props} />}
    </Modal>
  )
}
