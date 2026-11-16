import { useEffect, useState } from 'react'
import { Waveform } from './Waveform'
import { Button } from '../ui/Button'
import { useMediaRecorder } from '../../lib/audio/useMediaRecorder'

// Up to 5 minutes - the longest a recording can count for in XP (game-logic.ts).
const MAX_SECONDS = 300

function formatTime(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

interface RecordingUIProps {
  // Sends the recording; resolves true when it went through (then the screen
  // moves on), false to stay on the preview and let the pupil try again.
  onSend: (blob: Blob, durationSeconds: number) => Promise<boolean>
  sending?: boolean
  // True while the finished recording is being listened to (the screen hides
  // the "from a file" option meanwhile).
  onReviewingChange?: (reviewing: boolean) => void
}

// The microphone recorder. After stopping, the pupil hears the take first and
// chooses: send it to the teacher, or throw it away and record again.
export function RecordingUI({ onSend, sending, onReviewingChange }: RecordingUIProps) {
  const { status, elapsedSeconds, blob, levels, error, start, stop, reset } = useMediaRecorder(MAX_SECONDS)
  const [preview, setPreview] = useState<{ blob: Blob; url: string }>()
  const reviewing = status === 'stopped' && !!blob
  const previewUrl = preview && preview.blob === blob ? preview.url : undefined

  // An object URL for the preview, freed when the take is replaced or gone.
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setPreview({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])

  useEffect(() => {
    onReviewingChange?.(reviewing)
  }, [reviewing, onReviewingChange])

  if (reviewing) {
    return (
      <div className="py-6">
        <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-heading font-semibold text-sm">Tvoje nahrávka</div>
            <div className="text-xs text-text-muted">{formatTime(elapsedSeconds)}</div>
          </div>
          {previewUrl && <audio controls src={previewUrl} className="w-full" data-testid="take-preview" />}
          <p className="text-xs text-text-muted">Poslechni si ji. Povedla se? Pošli ji učiteli, jinak nahraj znovu.</p>
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" className="flex-1" disabled={sending} onClick={reset}>
              Nahrát znovu
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={sending}
              onClick={async () => {
                if (await onSend(blob, elapsedSeconds)) reset()
              }}
            >
              {sending ? 'Odesílám…' : 'Odeslat'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Waveform levels={status === 'recording' ? levels : undefined} />
      <div className="font-heading font-semibold text-sm text-text-muted">
        {formatTime(elapsedSeconds)} / {formatTime(MAX_SECONDS)}
      </div>
      <button
        className={`w-20 h-20 rounded-full bg-coral shadow-clay flex items-center justify-center ${
          status === 'recording' ? 'ring-8 ring-coral-tint animate-pulse motion-reduce:animate-none' : ''
        }`}
        aria-label={status === 'recording' ? 'Zastavit nahrávání' : 'Spustit nahrávání'}
        onClick={status === 'recording' ? stop : start}
      >
        <span className={`bg-cream ${status === 'recording' ? 'w-6 h-6 rounded' : 'w-6 h-6 rounded-full'}`} />
      </button>
      {error && (
        <p role="alert" className="text-sm text-coral-dark text-center">
          {error}
        </p>
      )}
      <p className="text-text-muted text-xs">
        {status === 'recording' ? 'Klepnutím zastavíš nahrávání' : 'Klepnutím začneš nahrávat'}
      </p>
    </div>
  )
}
