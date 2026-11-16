import { useEffect, useRef, useState } from 'react'
import { METERS, MAX_BPM, MIN_BPM, clampBpm, secondsPerBeat, tapTempo, tempoName, type Meter } from '../../lib/metronome'

const STORAGE_KEY = 'muzio-metronome'
const LOOKAHEAD_S = 0.12 // how far ahead clicks are scheduled
const TICK_MS = 25 // how often the scheduler looks

function loadSettings(): { bpm: number; meterId: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { bpm: clampBpm(Number(saved.bpm) || 80), meterId: METERS.some((m) => m.id === saved.meterId) ? saved.meterId : '4/4' }
  } catch {
    return { bpm: 80, meterId: '4/4' }
  }
}

// A short click: higher and louder on the accented beat.
function click(ctx: AudioContext, at: number, accent: boolean) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = accent ? 1600 : 1000
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, at + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + 0.06)
}

// Practice metronome: tempo, tap tempo, meter, the beat shown as dots.
// Clicks are scheduled ahead on the audio clock, so they stay steady even when
// the page is busy. Tempo and meter are remembered in this browser.
export function Metronome() {
  const [{ bpm, meterId }, setSettings] = useState(loadSettings)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(-1)
  const meter: Meter = METERS.find((m) => m.id === meterId) ?? METERS[2]
  const taps = useRef<number[]>([])

  // Read by the scheduler while it runs, so a tempo change applies at once.
  const live = useRef({ bpm, meter })
  useEffect(() => {
    live.current = { bpm, meter }
  }, [bpm, meter])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bpm, meterId }))
    } catch {
      // Not remembered - fine.
    }
  }, [bpm, meterId])

  useEffect(() => {
    if (!running) return
    const ctx = new AudioContext()
    let nextAt = ctx.currentTime + 0.05
    let index = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const interval = setInterval(() => {
      while (nextAt < ctx.currentTime + LOOKAHEAD_S) {
        const { bpm: b, meter: m } = live.current
        const position = index % m.beats
        click(ctx, nextAt, m.accents.includes(position))
        // Light the dot when the click is heard.
        const delay = Math.max(0, (nextAt - ctx.currentTime) * 1000)
        timers.push(setTimeout(() => setBeat(position), delay))
        nextAt += secondsPerBeat(b)
        index++
      }
    }, TICK_MS)
    return () => {
      clearInterval(interval)
      timers.forEach(clearTimeout)
      setBeat(-1)
      void ctx.close()
    }
  }, [running])

  const setBpm = (next: number) => setSettings((s) => ({ ...s, bpm: clampBpm(next) }))

  function tap() {
    const now = performance.now()
    taps.current = [...taps.current, now].slice(-8)
    const tempo = tapTempo(taps.current)
    if (tempo) setBpm(tempo)
  }

  const stepButton =
    'w-9 h-9 rounded-full bg-bg-card-alt shadow-clay-sm text-lg font-heading font-bold text-text-primary active:scale-95 transition'

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={stepButton} aria-label="Pomaleji" onClick={() => setBpm(bpm - 1)}>
          −
        </button>
        <div className="text-center">
          <div className="font-heading text-3xl font-bold leading-none tabular-nums" aria-live="polite">
            {bpm}
          </div>
          <div className="text-[11px] text-text-muted">
            BPM · {tempoName(bpm)}
          </div>
        </div>
        <button type="button" className={stepButton} aria-label="Rychleji" onClick={() => setBpm(bpm + 1)}>
          +
        </button>
      </div>

      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Tempo"
        className="w-full accent-coral"
      />

      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: meter.beats }, (_, i) => (
          <span
            key={i}
            className={`rounded-full transition-colors duration-75 ${meter.accents.includes(i) ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5 self-center'} ${
              beat === i ? 'bg-coral' : 'bg-bg-card-alt'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 gap-1" role="radiogroup" aria-label="Takt">
          {METERS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={m.id === meterId}
              onClick={() => setSettings((s) => ({ ...s, meterId: m.id }))}
              className={`flex-1 rounded-lg py-1.5 text-xs font-heading font-semibold transition ${
                m.id === meterId ? 'bg-coral-tint text-coral-dark shadow-clay-sm' : 'bg-bg-card-alt text-text-muted'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={tap}
          className="rounded-lg bg-bg-card-alt px-3 py-1.5 text-xs font-heading font-semibold text-text-muted hover:text-text-primary active:scale-95 transition"
        >
          Ťuk
        </button>
      </div>

      <button
        type="button"
        onClick={() => setRunning(!running)}
        className={`w-full rounded-xl py-2.5 font-heading font-semibold text-sm transition active:scale-95 ${
          running ? 'bg-ink text-cream' : 'bg-coral-dark text-cream shadow-clay'
        }`}
      >
        {running ? '■ Zastavit' : '▶ Spustit metronom'}
      </button>
    </div>
  )
}
