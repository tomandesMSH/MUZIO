import { useEffect, useState } from 'react'
import { VERDICT_TEXT, micVerdict, peakDb, type MicVerdict } from '../../lib/audio/micLevel'

const WINDOW = 30 // last 3 s at 10 readings a second

// "Vyzkoušet mikrofon": a live meter and a hint (too quiet / fine / too loud)
// before recording. The microphone is only open while this is shown.
export function MicCheck({ onClose }: { onClose: () => void }) {
  const [level, setLevel] = useState(-100)
  const [verdict, setVerdict] = useState<MicVerdict>('waiting')
  const [error, setError] = useState<string>()

  useEffect(() => {
    let stream: MediaStream | undefined
    let ctx: AudioContext | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    let stopped = false
    const peaks: number[] = []
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        ctx = new AudioContext()
        // Opened by a tap, but some browsers still start it suspended.
        void ctx.resume().catch(() => {})
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 2048
        ctx.createMediaStreamSource(s).connect(analyser)
        const samples = new Float32Array(analyser.fftSize)
        timer = setInterval(() => {
          analyser.getFloatTimeDomainData(samples)
          const db = peakDb(samples)
          peaks.push(db)
          if (peaks.length > WINDOW) peaks.shift()
          setLevel(db)
          setVerdict(micVerdict(peaks))
        }, 100)
      })
      .catch(() => setError('Nepodařilo se zapnout mikrofon. Povol ho prohlížeči (ikona vedle adresy).'))
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close()
    }
  }, [])

  // -60 dB .. 0 dB as 0..100 %.
  const percent = Math.max(0, Math.min(100, ((level + 60) / 60) * 100))
  const tone = verdict === 'good' ? 'bg-green-500' : verdict === 'loud' ? 'bg-coral-dark' : 'bg-amber-400'

  return (
    <div className="w-full rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-heading font-semibold text-sm">🎚 Test mikrofonu</span>
        <button type="button" className="text-xs text-text-muted underline underline-offset-2" onClick={onClose}>
          Hotovo
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      ) : (
        <>
          <div
            className="relative h-3 overflow-hidden rounded-full bg-bg-card-alt"
            role="meter"
            aria-label="Hlasitost mikrofonu"
            aria-valuemin={-60}
            aria-valuemax={0}
            aria-valuenow={Math.round(level)}
          >
            <div className={`h-full rounded-full transition-[width] duration-100 ${tone}`} style={{ width: `${percent}%` }} />
            {/* The "good" zone: from -30 dB to just below 0. */}
            <div className="absolute inset-y-0 border-l border-text-muted/50" style={{ left: '50%' }} aria-hidden />
          </div>
          <p className="text-sm" aria-live="polite">
            {VERDICT_TEXT[verdict]}
          </p>
        </>
      )}
    </div>
  )
}
