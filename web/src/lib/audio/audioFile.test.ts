import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkAudioFile, formatFileSize, MAX_AUDIO_FILE_MB, readAudioDuration, recordedFormat, pickRecorderType } from './audioFile'

const MB = 1024 * 1024

describe('checkAudioFile', () => {
  it('accepts an MP3 and keeps its type', () => {
    expect(checkAudioFile({ name: 'Etuda.MP3', type: 'audio/mpeg', size: 3 * MB })).toEqual({
      ok: true,
      extension: 'mp3',
      contentType: 'audio/mpeg',
    })
  })

  it('accepts an iPhone voice memo that comes without a type', () => {
    expect(checkAudioFile({ name: 'Nový záznam 3.m4a', type: '', size: MB })).toEqual({
      ok: true,
      extension: 'm4a',
      contentType: 'audio/mp4',
    })
  })

  it('accepts an audio type with an unknown extension under a neutral name', () => {
    expect(checkAudioFile({ name: 'nahravka', type: 'audio/x-caf', size: MB })).toEqual({
      ok: true,
      extension: 'audio',
      contentType: 'audio/x-caf',
    })
  })

  it('rejects files that are not audio', () => {
    const result = checkAudioFile({ name: 'noty.pdf', type: 'application/pdf', size: MB })
    expect(result.ok).toBe(false)
  })

  it('rejects empty and oversized files', () => {
    expect(checkAudioFile({ name: 'a.wav', type: 'audio/wav', size: 0 }).ok).toBe(false)
    expect(checkAudioFile({ name: 'a.wav', type: 'audio/wav', size: MAX_AUDIO_FILE_MB * MB }).ok).toBe(true)
    expect(checkAudioFile({ name: 'a.wav', type: 'audio/wav', size: MAX_AUDIO_FILE_MB * MB + 1 }).ok).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('uses kB below a megabyte and a Czech decimal comma above', () => {
    expect(formatFileSize(300)).toBe('1 kB')
    expect(formatFileSize(512 * 1024)).toBe('512 kB')
    expect(formatFileSize(3.25 * MB)).toBe('3,3 MB')
  })
})

describe('readAudioDuration', () => {
  // A stand-in <audio> that fires the event a real decoder would.
  function fakeAudio(event: 'loadedmetadata' | 'error' | null, duration = 0) {
    const el = {
      preload: '',
      duration,
      onloadedmetadata: null as null | (() => void),
      onerror: null as null | (() => void),
      removeAttribute: vi.fn(),
      set src(_value: string) {
        if (event === 'loadedmetadata') queueMicrotask(() => el.onloadedmetadata?.())
        if (event === 'error') queueMicrotask(() => el.onerror?.())
      },
    }
    vi.spyOn(document, 'createElement').mockReturnValue(el as unknown as HTMLElement)
  }

  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  afterEach(() => vi.restoreAllMocks())

  it('returns the length the browser reads', async () => {
    fakeAudio('loadedmetadata', 187.4)
    expect(await readAudioDuration(new Blob(['x']))).toBe(187.4)
  })

  it('returns null for a file the browser cannot decode', async () => {
    fakeAudio('error')
    expect(await readAudioDuration(new Blob(['x']))).toBeNull()
  })

  it('returns null for a stream without a finite length', async () => {
    fakeAudio('loadedmetadata', Infinity)
    expect(await readAudioDuration(new Blob(['x']))).toBeNull()
  })

  it('gives up after the timeout', async () => {
    fakeAudio(null)
    expect(await readAudioDuration(new Blob(['x']), 10)).toBeNull()
  })
})

describe('recordedFormat', () => {
  it('stores a take under its real type, not as WAV', () => {
    expect(recordedFormat('audio/webm;codecs=opus')).toEqual({ extension: 'webm', contentType: 'audio/webm' })
    expect(recordedFormat('audio/mp4;codecs=mp4a.40.2')).toEqual({ extension: 'm4a', contentType: 'audio/mp4' })
    expect(recordedFormat('audio/ogg;codecs=opus')).toEqual({ extension: 'ogg', contentType: 'audio/ogg' })
    expect(recordedFormat('')).toEqual({ extension: 'webm', contentType: 'audio/webm' })
  })
})

describe('pickRecorderType', () => {
  it('prefers AAC in MP4 (plays everywhere), then WebM/Opus', () => {
    expect(pickRecorderType(() => true)).toBe('audio/mp4;codecs=mp4a.40.2')
    expect(pickRecorderType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
    expect(pickRecorderType(() => false)).toBeUndefined()
  })
})
