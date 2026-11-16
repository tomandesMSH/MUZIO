import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Waveform } from './Waveform'
import { formatTime } from '../../lib/timestamps'

const SPEEDS = [0.5, 0.75, 1] as const

// What a screen can do with the player: jump to a time (comments with
// "0:42"), and read where it is (inserting the time into a comment).
export interface AudioPlayerHandle {
  seek: (seconds: number, play?: boolean) => void
  currentTime: () => number
}

interface AudioPlayerProps {
  src?: string
  ref?: Ref<AudioPlayerHandle>
  // Called as playback moves (whole seconds).
  onTime?: (seconds: number) => void
}

export function AudioPlayer({ src, ref, onTime }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  // Recordings straight from the browser's recorder have no length written
  // in them: the player jumps to the end once to learn it, then back.
  const probing = useRef(false)

  useEffect(() => {
    setPlaying(false)
    setTime(0)
    setDuration(0)
  }, [src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  useImperativeHandle(ref, () => ({
    seek(seconds, play = true) {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, Number.isFinite(audio.duration) ? Math.min(seconds, audio.duration) : seconds)
      setTime(audio.currentTime)
      if (play) void audio.play().catch(() => {})
    },
    currentTime: () => audioRef.current?.currentTime ?? 0,
  }))

  function learnDuration() {
    const audio = audioRef.current
    if (!audio) return
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
      if (probing.current) {
        probing.current = false
        audio.currentTime = 0
      }
    } else if (!probing.current) {
      probing.current = true
      audio.currentTime = 1e7
    }
  }

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.pause()
    else void audio.play().catch(() => {})
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio || probing.current) return
    setTime(audio.currentTime)
    onTime?.(Math.floor(audio.currentTime))
  }

  // Click or drag along the waveform to move.
  function seekToPointer(clientX: number) {
    const audio = audioRef.current
    const bar = barRef.current
    if (!audio || !bar || !duration) return
    const box = bar.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    audio.currentTime = fraction * duration
    setTime(audio.currentTime)
    onTime?.(Math.floor(audio.currentTime))
  }

  function handleKey(e: React.KeyboardEvent) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0
    if (!step) return
    e.preventDefault()
    audio.currentTime = Math.min(duration, Math.max(0, audio.currentTime + step))
    setTime(audio.currentTime)
  }

  const progress = duration ? time / duration : 0

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay p-4 space-y-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={learnDuration}
        onDurationChange={learnDuration}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
      />
      <div className="flex items-center gap-3">
        <button
          className="w-9 h-9 shrink-0 rounded-full bg-coral shadow-clay-sm flex items-center justify-center disabled:opacity-40"
          disabled={!src}
          onClick={toggle}
          aria-label={playing ? 'Pozastavit' : 'Přehrát'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div
          ref={barRef}
          role="slider"
          tabIndex={duration ? 0 : -1}
          aria-label="Pozice v nahrávce"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={formatTime(time)}
          className={`flex-1 touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-coral ${duration ? 'cursor-pointer' : ''}`}
          onPointerDown={(e) => {
            if (!duration) return
            e.currentTarget.setPointerCapture(e.pointerId)
            seekToPointer(e.clientX)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) seekToPointer(e.clientX)
          }}
          onKeyDown={handleKey}
        >
          <Waveform progress={progress} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                speed === s ? 'bg-coral-tint text-coral-dark shadow-clay-sm' : 'bg-bg-card-alt text-text-muted shadow-clay-press'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted tabular-nums" data-testid="player-time">
          {formatTime(time)}
          {duration ? ` / ${formatTime(duration)}` : ''}
        </span>
      </div>
    </div>
  )
}
