// Older recordings the pupil can save to their device before the admin
// clears out old sound files (0034). Offered from 30 days on.
import { extensionOf, stamp } from './exportMyData'
import type { PracticeLog } from './data/types'

export const DOWNLOAD_OFFER_AFTER_DAYS = 30

// Still has its sound and is at least 30 days old.
export function canOfferDownload(log: Pick<PracticeLog, 'audio_url' | 'created_at'>, now: Date): boolean {
  if (!log.audio_url) return false
  const age = now.getTime() - new Date(log.created_at).getTime()
  return age >= DOWNLOAD_OFFER_AFTER_DAYS * 24 * 60 * 60 * 1000
}

export function recordingFileName(log: Pick<PracticeLog, 'audio_url' | 'created_at'>): string {
  return `muzio-nahravka-${stamp(log.created_at)}.${extensionOf(log.audio_url ?? '', 'webm')}`
}

// The sound comes from storage on another origin, where <a download> is
// ignored - so it is fetched first and saved from a local blob.
export async function downloadRecording(log: Pick<PracticeLog, 'audio_url' | 'created_at'>): Promise<void> {
  if (!log.audio_url) throw new Error('Zvuk už byl archivován.')
  const response = await fetch(log.audio_url)
  if (!response.ok) throw new Error(`Stažení se nepovedlo (${response.status}).`)
  const url = URL.createObjectURL(await response.blob())
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = recordingFileName(log)
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}
