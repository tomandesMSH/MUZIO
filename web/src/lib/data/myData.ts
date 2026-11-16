import { supabase } from '../supabase'
import { fetchOwnLogs } from './practiceLogs'
import { fetchStudentAssignments, fetchStudentClassrooms } from './classrooms'
import { fetchAwardedBadges } from './badges'
import { fetchFeedbackAudioUrl } from './feedbackAudio'
import { fetchFeedbackImageUrls } from './feedbackImages'
import { buildArchive, extensionOf, recordingDownloads, stamp, zipFiles, type Download } from '../exportMyData'
import type { Profile } from './types'

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(String(response.status))
  return new Uint8Array(await response.arrayBuffer())
}

// "Stáhnout moje data": gathers everything about the pupil and returns the ZIP.
export async function exportMyData(profile: Profile, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const [logs, assignments, classrooms, awards, piecesRes] = await Promise.all([
    fetchOwnLogs(profile.id),
    fetchStudentAssignments().catch(() => []),
    fetchStudentClassrooms(profile.id).catch(() => []),
    fetchAwardedBadges(profile.id).catch(() => []),
    // All own pieces, also the ones hidden from the list (migration 0039).
    supabase.from('own_pieces').select('id, title').eq('student_id', profile.id),
  ])
  const pieces = new Map(((piecesRes.data ?? []) as { id: string; title: string }[]).map((p) => [p.id, p.title]))

  // The teacher's voice comments and pictures live in private storage: signed links.
  const downloads: Download[] = recordingDownloads(logs)
  for (const log of logs) {
    if (!log.feedback_audio) continue
    const url = await fetchFeedbackAudioUrl(log.feedback_audio).catch(() => '')
    if (url) downloads.push({ url, path: `komentare/${stamp(log.created_at)}_hlas.${extensionOf(log.feedback_audio, 'webm')}` })
  }
  const imagePaths = logs.flatMap((l) => l.feedback_images ?? [])
  const imageUrls = await fetchFeedbackImageUrls(imagePaths).catch(() => new Map<string, string>())
  for (const log of logs) {
    ;(log.feedback_images ?? []).forEach((path, i) => {
      const url = imageUrls.get(path)
      if (url) downloads.push({ url, path: `komentare/${stamp(log.created_at)}_obrazek-${i + 1}.${extensionOf(path, 'jpg')}` })
    })
  }

  const files = await buildArchive(
    {
      profile,
      logs,
      titles: new Map(assignments.map((a) => [a.id, a.title])),
      pieces,
      classrooms: classrooms.map((c) => c.name),
      awards,
    },
    downloads,
    fetchBytes,
    onProgress,
  )
  return zipFiles(files)
}
