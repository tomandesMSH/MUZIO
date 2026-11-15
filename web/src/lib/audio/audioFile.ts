// Checks an audio file a pupil picked from their phone or computer (#1) and
// works out what to store it as. Phones label files inconsistently (an
// iPhone voice memo can come with an empty type), so the extension counts too.

export const MAX_AUDIO_FILE_MB = 25

const TYPES_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  webm: 'audio/webm',
  flac: 'audio/flac',
  '3gp': 'audio/3gpp',
  amr: 'audio/amr',
}

// What the file picker offers; the check below is what actually decides.
export const AUDIO_FILE_ACCEPT = ['audio/*', ...Object.keys(TYPES_BY_EXTENSION).map((ext) => `.${ext}`)].join(',')

export type AudioFileCheck =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; error: string }

export function checkAudioFile(file: { name: string; type: string; size: number }): AudioFileCheck {
  const dot = file.name.lastIndexOf('.')
  const extension = dot === -1 ? '' : file.name.slice(dot + 1).toLowerCase()
  const knownType = TYPES_BY_EXTENSION[extension]

  if (!knownType && !file.type.startsWith('audio/')) {
    return { ok: false, error: 'Tohle není zvukový soubor. Vyber nahrávku, třeba MP3, M4A nebo WAV.' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'Soubor je prázdný.' }
  }
  if (file.size > MAX_AUDIO_FILE_MB * 1024 * 1024) {
    return { ok: false, error: `Soubor je moc velký. Nahrávka může mít nejvýš ${MAX_AUDIO_FILE_MB} MB.` }
  }

  const contentType = file.type.startsWith('audio/') ? file.type : (knownType ?? 'audio/mpeg')
  return { ok: true, extension: knownType ? extension : 'audio', contentType }
}

// Length of a picked file in seconds, read by the browser's own decoder. null
// when it can't tell (unknown format, broken file) - the recording is still
// sent and simply counts as one minute for XP.
export function readAudioDuration(file: Blob, timeoutMs = 5000): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    let settled = false
    const finish = (value: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () =>
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null)
    audio.onerror = () => finish(null)
    audio.src = url
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
