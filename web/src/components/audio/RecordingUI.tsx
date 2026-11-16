import { useEffect, useState } from 'react'
import { Waveform } from './Waveform'
import { Button } from '../ui/Button'
import { NoteForTeacher } from './NoteForTeacher'
import { MicCheck } from './MicCheck'
import { useMediaRecorder } from '../../lib/audio/useMediaRecorder'

// Seconds counted down before recording starts - time to get the hands on
// the keys, so the take doesn't open with silence and rustling.
export const COUNTDOWN_FROM = 3

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
  onSend: (blob: Blob, durationSeconds: number, note: string) => Promise<boolean>
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
  // 3, 2, 1 before recording; undefined when not counting.
  const [count, setCount] = useState<number>()
  const [note, setNote] = useState('')
  const [checkingMic, setCheckingMic] = useState(false)

  useEffect(() => {
    if (count === undefined) return
    const timer = setTimeout(() => {
      if (count > 1) setCount(count - 1)
      else {
        setCount(undefined)
        void start()
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [count, start])
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
          <NoteForTeacher value={note} onChange={setNote} />
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" className="flex-1" disabled={sending} onClick={reset}>
              Nahrát znovu
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={sending}
              onClick={async () => {
                if (await onSend(blob, elapsedSeconds, note)) {
                  setNote('')
                  reset()
                }
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
      {count !== undefined ? (
        <div className="flex h-[76px] flex-col items-center justify-center" aria-live="assertive">
          <span
            key={count}
            className="font-heading text-6xl font-bold leading-none text-coral animate-[countdown-pop_1s_ease-out] motion-reduce:animate-none"
          >
            {count}
          </span>
        </div>
      ) : (
        <>
          <Waveform levels={status === 'recording' ? levels : undefined} />
          <div className="font-heading font-semibold text-sm text-text-muted">
            {formatTime(elapsedSeconds)} / {formatTime(MAX_SECONDS)}
          </div>
        </>
      )}
      <button
        className={`w-20 h-20 rounded-full bg-coral shadow-clay flex items-center justify-center ${
          status === 'recording' ? 'ring-8 ring-coral-tint animate-pulse motion-reduce:animate-none' : ''
        }`}
        aria-label={
          status === 'recording' ? 'Zastavit nahrávání' : count !== undefined ? 'Zrušit odpočet' : 'Spustit nahrávání'
        }
        onClick={() => {
          if (status === 'recording') stop()
          else if (count !== undefined) setCount(undefined)
          else {
            // The test's microphone closes before recording opens its own.
            setCheckingMic(false)
            setCount(COUNTDOWN_FROM)
          }
        }}
      >
        <span
          className={`bg-cream ${status === 'recording' || count !== undefined ? 'w-6 h-6 rounded' : 'w-6 h-6 rounded-full'}`}
        />
      </button>
      {error && (
        <p role="alert" className="text-sm text-coral-dark text-center">
          {error}
        </p>
      )}
      {status !== 'recording' && count === undefined && (
        checkingMic ? (
          <MicCheck onClose={() => setCheckingMic(false)} />
        ) : (
          <button
            type="button"
            className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
            onClick={() => setCheckingMic(true)}
          >
            🎚 Vyzkoušet mikrofon
          </button>
        )
      )}
      <p className="text-text-muted text-xs">
        {status === 'recording'
          ? 'Klepnutím zastavíš nahrávání'
          : count !== undefined
            ? 'Připrav se… (klepnutím zrušíš)'
            : 'Klepnutím začneš nahrávat'}
      </p>
    </div>
  )
}
