import { useRef, useState } from 'react'
import { RecordingAudio } from '../audio/RecordingAudio'
import type { AudioPlayerHandle } from '../audio/AudioPlayer'
import { TimedText } from '../feedback/TimedText'
import { RatingNotes } from '../gamification/RatingNotes'
import { Collapse, Chevron } from '../ui/Collapse'
import { useQuery } from '../../lib/data/useQuery'
import { fetchAttempts } from '../../lib/data/practiceLogs'
import type { PracticeLog } from '../../lib/data/types'

function Attempt({ log, newer }: { log: PracticeLog; newer: boolean }) {
  const [open, setOpen] = useState(false)
  const player = useRef<AudioPlayerHandle>(null)
  const seek = log.audio_url ? (t: number) => player.current?.seek(t) : undefined
  const comment = [log.feedback_good, log.feedback_improve].filter(Boolean).join(' · ')
  return (
    <li className="rounded-xl bg-bg-card-alt">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs text-text-muted tabular-nums shrink-0">
          {new Date(log.created_at).toLocaleDateString('cs-CZ')}
          {newer && ' · novější'}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
          {log.teacher_comment ? comment || 'ohodnoceno' : 'čeká na hodnocení'}
        </span>
        {log.rating ? (
          <span className="shrink-0 text-xs">
            <RatingNotes rating={log.rating} />
          </span>
        ) : null}
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        {open && (
          <div className="space-y-2 px-3 pb-3 text-sm">
            <RecordingAudio src={log.audio_url} ref={player} />
            {log.feedback_good && (
              <p className="whitespace-pre-wrap break-words">
                ✅ <TimedText text={log.feedback_good} onSeek={seek} />
              </p>
            )}
            {log.feedback_improve && (
              <p className="whitespace-pre-wrap break-words">
                🎯 <TimedText text={log.feedback_improve} onSeek={seek} />
              </p>
            )}
          </div>
        )}
      </Collapse>
    </li>
  )
}

// Grading: the pupil's other recordings of the same assignment or own piece,
// to hear whether it's getting better. Nothing shows for a first attempt.
export function PreviousAttempts({ log }: { log: PracticeLog }) {
  const [open, setOpen] = useState(false)
  const attempts = useQuery(() => fetchAttempts(log).catch(() => [] as PracticeLog[]), [log.id])
  const list = attempts.data ?? []
  if (list.length === 0) return null
  const at = new Date(log.created_at).getTime()
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-1 py-1.5 text-sm font-heading font-semibold"
      >
        <span>🕘 Další pokusy u tohoto úkolu ({list.length})</span>
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        <ul className="space-y-1.5 pb-1">
          {list.map((attempt) => (
            <Attempt key={attempt.id} log={attempt} newer={new Date(attempt.created_at).getTime() > at} />
          ))}
        </ul>
      </Collapse>
    </div>
  )
}
