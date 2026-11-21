import { useEffect, useRef, useState } from 'react'
import { useMediaRecorder } from '../../lib/audio/useMediaRecorder'
import { trimSilence } from '../../lib/audio/trim'
import { MAX_VOICE_SECONDS, fetchFeedbackAudioUrl } from '../../lib/data/feedbackAudio'

// What the grade will have: nothing, the comment already saved, or a new one.
export type VoiceCommentState =
  | { kind: 'none' }
  | { kind: 'saved'; path: string }
  | { kind: 'new'; blob: Blob; seconds: number }

function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [entry, setEntry] = useState<{ blob: Blob; url: string }>()
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setEntry({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return entry && entry.blob === blob ? entry.url : undefined
}

// Plays a saved comment (signed link from the private bucket).
export function SavedVoiceComment({ path }: { path: string }) {
  const [url, setUrl] = useState<{ path: string; url: string }>()
  useEffect(() => {
    let cancelled = false
    fetchFeedbackAudioUrl(path)
      .then((u) => !cancelled && setUrl({ path, url: u }))
      .catch(() => {
        // Not playable now (offline); the rest of the grade is still there.
      })
    return () => {
      cancelled = true
    }
  }, [path])
  return url?.path === path ? (
    <audio controls src={url.url} className="w-full h-10" data-testid="voice-comment" />
  ) : (
    <p className="text-xs text-text-muted">Načítám komentář…</p>
  )
}

function seconds(n: number) {
  return `0:${String(n).padStart(2, '0')}`
}

// Grading: record a short spoken comment (or play the bar the right way), hear
// it back, keep it or record again.
export function VoiceCommentEditor({ value, onChange }: { value: VoiceCommentState; onChange: (v: VoiceCommentState) => void }) {
  const { status, elapsedSeconds, blob, error, start, stop, reset } = useMediaRecorder(MAX_VOICE_SECONDS)
  const newUrl = useObjectUrl(value.kind === 'new' ? value.blob : undefined)

  // The comment as it is now, for the silence cut finishing later.
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  })

  // A finished recording becomes the comment; the silence around it is cut
  // off a moment later (unless it has been replaced or removed meanwhile).
  useEffect(() => {
    if (status === 'stopped' && blob) {
      onChange({ kind: 'new', blob, seconds: elapsedSeconds })
      reset()
      void trimSilence(blob).then((trimmed) => {
        const now = latest.current
        if (trimmed && now.kind === 'new' && now.blob === blob) {
          onChange({ kind: 'new', blob: trimmed.blob, seconds: Math.max(1, Math.round(trimmed.duration)) })
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, blob])

  const linkButton = 'text-xs text-text-muted underline underline-offset-2 hover:text-text-primary'

  if (status === 'recording') {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-bg-card-alt px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-coral animate-pulse motion-reduce:animate-none" aria-hidden />
        <span className="flex-1 text-sm tabular-nums">
          Nahrávám {seconds(elapsedSeconds)} / {seconds(MAX_VOICE_SECONDS).replace('0:60', '1:00')}
        </span>
        <button type="button" className="rounded-lg bg-coral px-3 py-1.5 text-xs font-heading font-semibold text-white" onClick={stop}>
          Stop
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {value.kind === 'saved' && <SavedVoiceComment path={value.path} />}
      {value.kind === 'new' && newUrl && <audio controls src={newUrl} className="w-full h-10" data-testid="voice-comment" />}
      <div className="flex flex-wrap gap-3">
        {value.kind === 'none' ? (
          <button
            type="button"
            onClick={() => void start()}
            className="rounded-full bg-bg-card-alt px-3 py-1.5 text-xs font-heading font-semibold shadow-clay-sm hover:text-coral-dark"
          >
            Nahrát hlasový komentář
          </button>
        ) : (
          <>
            <button type="button" className={linkButton} onClick={() => void start()}>
              Nahrát znovu
            </button>
            <button type="button" className={linkButton} onClick={() => onChange({ kind: 'none' })}>
              Smazat komentář
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-coral-dark">
          {error}
        </p>
      )}
    </div>
  )
}
