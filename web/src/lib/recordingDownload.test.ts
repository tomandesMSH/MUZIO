import { describe, expect, it } from 'vitest'
import { canOfferDownload, recordingFileName } from './recordingDownload'

const now = new Date('2026-11-21T12:00:00')
const url = 'https://x.supabase.co/storage/v1/object/public/recordings/u/1.webm'

describe('canOfferDownload', () => {
  it('from 30 days on, while the sound is there', () => {
    expect(canOfferDownload({ audio_url: url, created_at: '2026-10-22T12:00:00' }, now)).toBe(true)
    expect(canOfferDownload({ audio_url: url, created_at: '2026-10-23T12:00:00' }, now)).toBe(false)
    expect(canOfferDownload({ audio_url: null, created_at: '2026-01-01T12:00:00' }, now)).toBe(false)
  })
})

describe('recordingFileName', () => {
  it('names the file by the date and keeps the format', () => {
    expect(recordingFileName({ audio_url: url, created_at: '2026-10-01T08:05:00' })).toMatch(/^muzio-nahravka-.+\.webm$/)
  })
})
