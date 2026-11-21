import { useEffect, useRef, useState } from 'react'
import { RecordingAudio } from '../audio/RecordingAudio'
import { RatingNotes } from '../gamification/RatingNotes'
import { Collapse, Chevron } from '../ui/Collapse'
import { progressPairs } from '../../lib/progressPairs'
import type { PracticeLog } from '../../lib/data/types'

// "Před a po": the first and the latest recording of each assignment or own
// piece, one under the other. Shown only when there is something to compare.
export function BeforeAfter({
  logs,
  titleFor,
  heading = 'Tvůj pokrok',
  intro = 'Pusť si první a poslední nahrávku stejné skladby a poslechni si, kam ses posunul(a).',
}: {
  logs: PracticeLog[] | undefined
  titleFor: (pair: { assignmentId?: string; ownPieceId?: string }) => string | undefined
  heading?: string
  intro?: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const pairs = progressPairs<PracticeLog>(logs ?? [])

  // One player at a time: starting one pauses the others. 'play' doesn't
  // bubble, so it's caught on the way down.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onPlay = (event: Event) => {
      for (const audio of el.querySelectorAll('audio')) if (audio !== event.target) audio.pause()
    }
    el.addEventListener('play', onPlay, true)
    return () => el.removeEventListener('play', onPlay, true)
  }, [pairs.length])

  if (pairs.length === 0) return null
  const date = (iso: string) => new Date(iso).toLocaleDateString('cs-CZ')

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left font-heading font-semibold"
      >
        <span>
          {heading} <span className="font-body font-normal text-xs text-text-muted">({pairs.length})</span>
        </span>
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        <div ref={box} className="space-y-4 pt-3">
          <p className="text-xs text-text-muted">{intro}</p>
          {pairs.map((pair) => (
            <div key={pair.key} className="space-y-2 rounded-xl bg-bg-card-alt p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading font-semibold text-sm">{titleFor(pair) ?? 'Skladba'}</span>
                <span className="shrink-0 text-xs text-text-muted">{pair.count} {pair.count <= 4 ? 'nahrávky' : 'nahrávek'}</span>
              </div>
              {[
                { label: 'Poprvé', log: pair.first },
                { label: 'Naposledy', log: pair.latest },
              ].map(({ label, log }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span>
                      <b>{label}</b> <span className="text-text-muted">· {date(log.created_at)}</span>
                    </span>
                    {log.rating ? <RatingNotes rating={log.rating} /> : null}
                  </div>
                  <RecordingAudio src={log.audio_url} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  )
}
