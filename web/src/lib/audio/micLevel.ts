// Microphone check before recording: is the instrument heard well?
export type MicVerdict = 'waiting' | 'quiet' | 'good' | 'loud'

// Peak level of a block of samples (-1..1) in dBFS (0 = the loudest possible).
export function peakDb(samples: Float32Array | number[]): number {
  let peak = 0
  for (const s of samples) peak = Math.max(peak, Math.abs(s))
  return peak > 0 ? 20 * Math.log10(peak) : -100
}

// Judged on the loudest moment of the last few seconds (playing has pauses).
export const QUIET_BELOW_DB = -30
export const LOUD_FROM_DB = -1

export function micVerdict(recentPeaksDb: number[], minSamples = 10): MicVerdict {
  if (recentPeaksDb.length < minSamples) return 'waiting'
  const loudest = Math.max(...recentPeaksDb)
  const clipped = recentPeaksDb.filter((db) => db >= LOUD_FROM_DB).length
  if (clipped >= 3) return 'loud'
  if (loudest < QUIET_BELOW_DB) return 'quiet'
  return 'good'
}

export const VERDICT_TEXT: Record<MicVerdict, string> = {
  waiting: 'Zahraj pár tónů tak nahlas, jak budeš hrát…',
  quiet: 'Je tě slabě slyšet. Přibliž telefon k nástroji nebo zesil hru.',
  good: 'Zvuk je v pořádku, můžeš nahrávat.',
  loud: 'Zvuk se přebíjí (zkresluje). Oddal telefon od nástroje.',
}
