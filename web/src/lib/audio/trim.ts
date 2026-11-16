// Cutting the silence off the start and end of a take before it is sent.
// The search (findSoundBounds) is plain maths and tested; the cut itself copies
// the recording's own encoded audio (mediabunny, loaded only when needed), so
// nothing is re-encoded and the sound stays exactly as recorded.

const WINDOW_S = 0.02
// Kept around the playing: a breath before it, the ring of the last note after.
export const LEAD_S = 0.3
export const TAIL_S = 0.8
// Cutting less than this isn't worth it.
export const MIN_CUT_S = 0.5

export interface SoundBounds {
  // Seconds into the take where the kept part starts / ends.
  start: number
  end: number
}

// Where the playing is: the first and last moment clearly above the room's
// noise. Undefined when nothing stands out (all silence, or loud throughout).
export function findSoundBounds(samples: Float32Array, sampleRate: number): SoundBounds | undefined {
  const size = Math.max(1, Math.round(WINDOW_S * sampleRate))
  const count = Math.floor(samples.length / size)
  if (count < 2) return undefined
  const rms = new Float32Array(count)
  for (let w = 0; w < count; w++) {
    let sum = 0
    for (let i = w * size; i < (w + 1) * size; i++) sum += samples[i] * samples[i]
    rms[w] = Math.sqrt(sum / size)
  }
  let peak = 0
  for (const v of rms) peak = Math.max(peak, v)
  if (peak < 0.003) return undefined // nothing but silence
  // The room: the quietest stretch (a short pause at the start is enough).
  // Averaged over 0.1 s, so a single quiet blip between notes doesn't count.
  let floor = Infinity
  for (let w = 0; w + 5 <= count; w++) {
    floor = Math.min(floor, (rms[w] + rms[w + 1] + rms[w + 2] + rms[w + 3] + rms[w + 4]) / 5)
  }
  if (!Number.isFinite(floor)) floor = 0
  // Above the noise by 12 dB, and no more than 40 dB under the loudest part.
  const threshold = Math.max(floor * 4, peak * 0.01)
  let first = -1
  let last = -1
  for (let w = 0; w < count; w++) {
    if (rms[w] >= threshold) {
      if (first < 0) first = w
      last = w
    }
  }
  if (first < 0) return undefined
  const total = samples.length / sampleRate
  return {
    start: Math.max(0, first * WINDOW_S - LEAD_S),
    end: Math.min(total, (last + 1) * WINDOW_S + TAIL_S),
  }
}

// Whether a cut is worth making: enough comes off, and something is left.
export function worthCutting(bounds: SoundBounds | undefined, total: number): bounds is SoundBounds {
  if (!bounds) return false
  return bounds.start + (total - bounds.end) >= MIN_CUT_S && bounds.end - bounds.start >= 1
}

export interface TrimmedTake {
  blob: Blob
  // Seconds cut off the start and the end, and the length now.
  cutStart: number
  cutEnd: number
  duration: number
}

async function decodeMono(blob: Blob): Promise<{ samples: Float32Array; rate: number; total: number }> {
  const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
  const ctx = new Offline(1, 1, 44100)
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
  return { samples: audio.getChannelData(0), rate: audio.sampleRate, total: audio.duration }
}

// The take without the silence around it, or undefined when there's nothing
// worth cutting or this browser can't do it (then the whole take is sent).
export async function trimSilence(blob: Blob): Promise<TrimmedTake | undefined> {
  try {
    const { samples, rate, total } = await decodeMono(blob)
    const bounds = findSoundBounds(samples, rate)
    if (!worthCutting(bounds, total)) return undefined

    const mb = await import('mediabunny')
    const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS })
    const inputFormat = await input.getFormat()
    const format =
      inputFormat === mb.MP4 || inputFormat === mb.QTFF
        ? new mb.Mp4OutputFormat()
        : inputFormat === mb.OGG
          ? new mb.OggOutputFormat()
          : new mb.WebMOutputFormat()
    const target = new mb.BufferTarget()
    const output = new mb.Output({ format, target })
    const conversion = await mb.Conversion.init({
      input,
      output,
      trim: { start: bounds.start, end: bounds.end },
      // Copy the encoded audio as it is (packets are ~20 ms, so the cut lands
      // within a hair of the asked-for spot).
      copy: { shiftTolerance: Infinity },
      showWarnings: false,
    })
    if (!conversion.isValid) return undefined
    await conversion.execute()
    if (!target.buffer) return undefined
    const trimmed = new Blob([target.buffer], { type: blob.type || format.mimeType })
    // The cut lands on packet edges, so its real length is read back.
    const duration = await decodeMono(trimmed)
      .then((d) => d.total)
      .catch(() => bounds.end - bounds.start)
    return { blob: trimmed, cutStart: bounds.start, cutEnd: total - bounds.end, duration }
  } catch {
    return undefined
  }
}
