import { useEffect, useRef, useState } from 'react'
import { MAX_A4, MIN_A4, clampA4, detectPitch, median, noteFor } from '../../lib/audio/pitch'

const STORAGE_KEY = 'muzio-tuner-a4'
const READ_MS = 70
const SMOOTH = 5 // readings in the median
const HOLD_MS = 1200 // the last note stays shown this long after the tone ends
const IN_TUNE = 5 // cents

function loadA4(): number {
  try {
    return clampA4(Number(localStorage.getItem(STORAGE_KEY)) || 440)
  } catch {
    return 440
  }
}

function hint(cents: number): string {
  if (Math.abs(cents) <= IN_TUNE) return 'čistě'
  return cents < 0 ? `nízko o ${-cents} centů, zvyš ↑` : `vysoko o ${cents} centů, sniž ↓`
}

// Tuner: listens through the microphone and shows the nearest note and how
// far off it is. The microphone is only open while it's switched on.
export function Tuner() {
  const [on, setOn] = useState(false)
  const [a4, setA4] = useState(loadA4)
  const [hz, setHz] = useState<number>()
  const [error, setError] = useState<string>()
  const lastHeard = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(a4))
    } catch {
      // Not remembered - fine.
    }
  }, [a4])

  useEffect(() => {
    if (!on) return
    let stream: MediaStream | undefined
    let ctx: AudioContext | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    let stopped = false
    const recent: number[] = []
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        ctx = new AudioContext()
        void ctx.resume().catch(() => {})
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 4096
        ctx.createMediaStreamSource(s).connect(analyser)
        const samples = new Float32Array(analyser.fftSize)
        const rate = ctx.sampleRate
        timer = setInterval(() => {
          analyser.getFloatTimeDomainData(samples)
          const pitch = detectPitch(samples, rate)
          const now = performance.now()
          if (pitch && pitch.clarity > 0.8) {
            // A jump of more than a semitone starts the smoothing over.
            const last = recent[recent.length - 1]
            if (last && Math.abs(1200 * Math.log2(pitch.hz / last)) > 100) recent.length = 0
            recent.push(pitch.hz)
            if (recent.length > SMOOTH) recent.shift()
            lastHeard.current = now
            setHz(median(recent))
          } else if (now - lastHeard.current > HOLD_MS) {
            recent.length = 0
            setHz(undefined)
          }
        }, READ_MS)
      })
      .catch(() => {
        setError('Nepodařilo se zapnout mikrofon. Povol ho prohlížeči (ikona vedle adresy).')
        setOn(false)
      })
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close()
      setHz(undefined)
    }
  }, [on])

  const note = hz ? noteFor(hz, a4) : undefined
  const inTune = note !== undefined && Math.abs(note.cents) <= IN_TUNE
  const stepButton =
    'w-7 h-7 rounded-full bg-bg-card-alt shadow-clay-sm text-sm font-heading font-bold text-text-primary active:scale-95 transition disabled:opacity-40'

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
      <div className="text-center" aria-live="polite">
        <div
          className={`font-heading text-5xl font-bold leading-none transition-colors ${
            !note ? 'text-text-muted' : inTune ? 'text-green-600 dark:text-green-400' : 'text-text-primary'
          }`}
        >
          {note ? note.czech : '-'}
        </div>
        <div className="mt-1 text-xs text-text-muted tabular-nums">
          {note && hz
            ? `${hz.toFixed(1)} Hz · ${hint(note.cents)}`
            : on
              ? 'Zahraj jeden tón…'
              : 'Ladička poslouchá mikrofonem.'}
        </div>
      </div>

      <div className="relative h-6" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-bg-card-alt" />
        <div className="absolute left-[45%] right-[45%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-green-500/40" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-text-muted/50" />
        {note && (
          <div
            data-testid="tuner-needle"
            className={`absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full transition-[left] duration-100 ${
              inTune ? 'bg-green-500' : 'bg-coral'
            }`}
            style={{ left: `${50 + note.cents}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-text-muted" aria-hidden="true">
        <span>−50</span>
        <span>0</span>
        <span>+50</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <button
            type="button"
            className={stepButton}
            aria-label="Ladění níž"
            disabled={a4 <= MIN_A4}
            onClick={() => setA4(clampA4(a4 - 1))}
          >
            −
          </button>
          <span className="tabular-nums">a¹ = {a4} Hz</span>
          <button
            type="button"
            className={stepButton}
            aria-label="Ladění výš"
            disabled={a4 >= MAX_A4}
            onClick={() => setA4(clampA4(a4 + 1))}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(undefined)
            setOn(!on)
          }}
          className={`rounded-xl px-4 py-2 font-heading font-semibold text-sm transition active:scale-95 ${
            on ? 'bg-ink text-cream' : 'bg-coral-dark text-cream shadow-clay'
          }`}
        >
          {on ? '■ Vypnout' : '▶ Zapnout'}
        </button>
      </div>
      {error && <p className="text-xs text-coral-dark">{error}</p>}
    </div>
  )
}
