// Short sounds made right in the browser (Web Audio), no sound files: one when
// a recording goes to the teacher, a fanfare for a finished phase of the
// world. "Zvuk při dokončení" in the pupil's settings turns them off on this
// device. Any failure (no Web Audio, blocked autoplay) is silent.

const STORAGE_KEY = 'muzio-sounds'

export function soundsOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundsOn(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Not remembered on this device.
  }
}

let context: AudioContext | undefined

function audio(): AudioContext | undefined {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return undefined
    context ??= new Ctor()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return undefined
  }
}

// One soft bell-like note: frequency, start (s from now), length (s).
function tone(ctx: AudioContext, freq: number, start: number, length: number, volume = 0.18, type: OscillatorType = 'sine') {
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

// A rising swish, like something flying away.
function swish(ctx: AudioContext, start: number, length: number) {
  const t = ctx.currentTime + start
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(400, t)
  filter.frequency.exponentialRampToValueAtTime(3200, t + length)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.08, t + length * 0.3)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start(t)
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1567.98 }

// The recording is on its way to the teacher.
export function playSent(): void {
  if (!soundsOn()) return
  const ctx = audio()
  if (!ctx) return
  swish(ctx, 0, 0.45)
  tone(ctx, NOTE.G5, 0.15, 0.35)
  tone(ctx, NOTE.C6, 0.3, 0.6)
}

// A phase of the world is done: 1-3 a short fanfare, 4 (the whole world) a
// longer one.
export function playFanfare(phase: number): void {
  if (!soundsOn()) return
  const ctx = audio()
  if (!ctx) return
  const notes = phase >= 4 ? [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6] : [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6]
  notes.forEach((freq, i) => tone(ctx, freq, i * 0.11, 0.4, 0.14, 'triangle'))
  const end = notes.length * 0.11
  for (const freq of phase >= 4 ? [NOTE.C6, NOTE.E6, NOTE.G6] : [NOTE.C6, NOTE.E6]) tone(ctx, freq, end, 1.1, 0.09, 'triangle')
}
