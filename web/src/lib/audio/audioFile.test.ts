import { describe, expect, it } from 'vitest'
import { checkAudioFile, formatFileSize, MAX_AUDIO_FILE_MB } from './audioFile'

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
