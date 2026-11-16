import { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { deletePendingUpload, listPendingUploads, savePendingUpload, type PendingUpload } from '../../lib/pendingUploads'
import { SubmitError, submitRecording } from '../../lib/submitRecording'
import { getErrorMessage } from '../../lib/errors'

interface PendingUploadsProps {
  userId: string
  onSent: () => void
  onMessage: (text: string) => void
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Dashboard: recordings that didn't reach the teacher, with "Odeslat znovu"
// and "Zahodit". Nothing is shown when there are none.
export function PendingUploads({ userId, onSent, onMessage }: PendingUploadsProps) {
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [busyId, setBusyId] = useState<string>()
  const [confirmDrop, setConfirmDrop] = useState<string>()

  const load = useCallback(() => {
    void listPendingUploads(userId).then(setUploads)
  }, [userId])

  useEffect(load, [load])

  async function send(upload: PendingUpload) {
    setBusyId(upload.id)
    try {
      await submitRecording(upload)
      await deletePendingUpload(upload.id)
      onMessage('Nahrávka odeslána ke kontrole')
      onSent()
    } catch (err) {
      // Remember an upload that got through, so the next try doesn't repeat it.
      if (err instanceof SubmitError && err.audioUrl && !upload.audioUrl) {
        await savePendingUpload({ ...upload, audioUrl: err.audioUrl })
      }
      onMessage(getErrorMessage(err, 'Pořád se to nedaří odeslat. Zkus to, až budeš mít lepší signál.'))
    } finally {
      setBusyId(undefined)
      load()
    }
  }

  async function drop(id: string) {
    await deletePendingUpload(id)
    setConfirmDrop(undefined)
    load()
  }

  if (uploads.length === 0) return null

  return (
    <div className="rounded-2xl border border-coral/40 bg-bg-card p-4 space-y-3" role="region" aria-label="Neodeslané nahrávky">
      <div>
        <h2 className="font-heading font-semibold text-sm">
          {uploads.length === 1 ? 'Neodeslaná nahrávka' : `Neodeslané nahrávky (${uploads.length})`}
        </h2>
        <p className="text-xs text-text-muted">Neodešla se k učiteli, ale máš ji uloženou tady v zařízení.</p>
      </div>
      {uploads.map((upload) => (
        <div key={upload.id} className="rounded-xl bg-bg-card-alt p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold truncate">{upload.lessonTitle || 'Samostatné cvičení'}</span>
            <span className="shrink-0 text-xs text-text-muted">{when(upload.createdAt)}</span>
          </div>
          <PendingAudio blob={upload.blob} />
          <div className="flex gap-2">
            {confirmDrop === upload.id ? (
              <>
                <Button variant="ghost" className="flex-1 !py-2" onClick={() => setConfirmDrop(undefined)}>
                  Nechat
                </Button>
                <Button variant="destructive" className="flex-1 !py-2" onClick={() => void drop(upload.id)}>
                  Opravdu zahodit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="flex-1 !py-2"
                  disabled={busyId !== undefined}
                  onClick={() => setConfirmDrop(upload.id)}
                >
                  Zahodit
                </Button>
                <Button className="flex-1 !py-2" disabled={busyId !== undefined} onClick={() => void send(upload)}>
                  {busyId === upload.id ? 'Odesílám…' : 'Odeslat znovu'}
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingAudio({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url ? <audio controls src={url} className="w-full h-9" /> : null
}
