import { describe, expect, it } from 'vitest'
import { renamedPath, sniffAudio } from './audio-sniff.mjs'

const bytes = (...parts) => new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))

describe('sniffAudio', () => {
  it('tells the real format from the first bytes', () => {
    expect(sniffAudio(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x10, 0, 0, 0x1f, 0x42, 0x86, 0x81, 1]))?.extension).toBe('webm')
    expect(sniffAudio(bytes([0, 0, 0, 0x1c], 'ftypM4A '))?.contentType).toBe('audio/mp4')
    expect(sniffAudio(bytes('OggS', [0, 2, 0, 0, 0, 0, 0, 0]))?.extension).toBe('ogg')
    expect(sniffAudio(bytes('RIFF', [0, 0, 0, 0], 'WAVE'))?.extension).toBe('wav')
    expect(sniffAudio(bytes('ID3', [4, 0, 0, 0, 0, 0, 0, 0, 0]))?.extension).toBe('mp3')
    expect(sniffAudio(bytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeUndefined()
  })

  it('renames only the .wav ending', () => {
    expect(renamedPath('u1/1795367005452.wav', 'webm')).toBe('u1/1795367005452.webm')
    expect(renamedPath('42/123.WAV', 'm4a')).toBe('42/123.m4a')
  })
})
