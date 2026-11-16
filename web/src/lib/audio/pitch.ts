// Tuner logic without the microphone (tested): the pitch of a block of
// samples (YIN) and the note it is, with Czech names.

export const MIN_HZ = 50 // a little under the lowest cello / guitar string
export const MAX_HZ = 2000
const THRESHOLD = 0.15 // YIN: how clear a period must be
const SILENCE_RMS = 0.01

export interface Pitch {
  hz: number
  // 0..1, how sure (1 = a clean tone).
  clarity: number
}

// The pitch of the samples, or undefined for silence or noise.
export function detectPitch(samples: Float32Array, sampleRate: number): Pitch | undefined {
  let sum = 0
  for (const s of samples) sum += s * s
  if (Math.sqrt(sum / samples.length) < SILENCE_RMS) return undefined

  const tauMin = Math.max(2, Math.floor(sampleRate / MAX_HZ))
  const tauMax = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(samples.length / 2))
  const width = samples.length - tauMax
  if (tauMax <= tauMin || width <= 0) return undefined

  // Difference function, then its cumulative mean normalised form.
  const cmnd = new Float32Array(tauMax + 1)
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    let d = 0
    for (let j = 0; j < width; j++) {
      const diff = samples[j] - samples[j + tau]
      d += diff * diff
    }
    running += d
    cmnd[tau] = running > 0 ? (d * tau) / running : 1
  }

  // The first dip under the threshold, followed down to its bottom.
  let tau = -1
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < THRESHOLD) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++
      tau = t
      break
    }
  }
  if (tau < 0) return undefined

  // Parabolic interpolation between the neighbours for a finer period.
  let better = tau
  if (tau > 1 && tau < tauMax) {
    const a = cmnd[tau - 1]
    const b = cmnd[tau]
    const c = cmnd[tau + 1]
    const denom = a + c - 2 * b
    if (denom !== 0) better = tau + (a - c) / (2 * denom)
  }
  return { hz: sampleRate / better, clarity: Math.max(0, Math.min(1, 1 - cmnd[tau])) }
}

const NAMES = ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H']

export interface Note {
  // C, Cis … B, H (Czech: B is B flat, H is B natural).
  name: string
  // Scientific octave: A4 is the A above middle C.
  octave: number
  // Czech octave spelling: c¹ for middle C, a¹ for A4, c for C3, C for C2.
  czech: string
  // -50..50: how far off the note (negative = too low).
  cents: number
  // The exact frequency of the note.
  targetHz: number
}

const SUPERSCRIPT = ['', '¹', '²', '³', '⁴', '⁵']
const SUBSCRIPT = ['', '₁', '₂']

export function czechOctaveName(name: string, octave: number): string {
  if (octave >= 4) return name.toLowerCase() + (SUPERSCRIPT[octave - 3] ?? `${octave - 3}`)
  if (octave === 3) return name.toLowerCase()
  if (octave === 2) return name
  return name + (SUBSCRIPT[2 - octave] ?? '')
}

export function noteFor(hz: number, a4 = 440): Note {
  const midi = 69 + 12 * Math.log2(hz / a4)
  const nearest = Math.round(midi)
  const name = NAMES[((nearest % 12) + 12) % 12]
  const octave = Math.floor(nearest / 12) - 1
  return {
    name,
    octave,
    czech: czechOctaveName(name, octave),
    cents: Math.round((midi - nearest) * 100),
    targetHz: a4 * 2 ** ((nearest - 69) / 12),
  }
}

// Steadier reading: the median of the last few.
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export const MIN_A4 = 430
export const MAX_A4 = 450

export function clampA4(a4: number): number {
  return Math.round(Math.min(MAX_A4, Math.max(MIN_A4, a4)))
}
