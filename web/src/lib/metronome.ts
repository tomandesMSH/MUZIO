// Metronome logic without sound (tested): meters, tempo limits, tap tempo.
export const MIN_BPM = 40
export const MAX_BPM = 208

export interface Meter {
  id: string
  label: string
  beats: number
  // 6/8 is counted in eighths: accents on 1 and 4.
  accents: number[]
}

export const METERS: Meter[] = [
  { id: '2/4', label: '2/4', beats: 2, accents: [0] },
  { id: '3/4', label: '3/4', beats: 3, accents: [0] },
  { id: '4/4', label: '4/4', beats: 4, accents: [0] },
  { id: '6/8', label: '6/8', beats: 6, accents: [0, 3] },
]

export function clampBpm(bpm: number): number {
  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)))
}

export function secondsPerBeat(bpm: number): number {
  return 60 / clampBpm(bpm)
}

// Tap tempo: the average of the last few intervals (ms timestamps). Taps more
// than 2 s apart start over. Undefined until there are two taps.
export function tapTempo(taps: number[]): number | undefined {
  const recent: number[] = []
  for (let i = taps.length - 1; i >= 0; i--) {
    if (recent.length > 0 && recent[0] - taps[i] > 2000) break
    recent.unshift(taps[i])
    if (recent.length === 6) break
  }
  if (recent.length < 2) return undefined
  const average = (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
  return clampBpm(60000 / average)
}

// Italian tempo name, the way music teachers say it.
export function tempoName(bpm: number): string {
  if (bpm < 60) return 'Largo'
  if (bpm < 76) return 'Adagio'
  if (bpm < 108) return 'Andante'
  if (bpm < 120) return 'Moderato'
  if (bpm < 168) return 'Allegro'
  return 'Presto'
}
