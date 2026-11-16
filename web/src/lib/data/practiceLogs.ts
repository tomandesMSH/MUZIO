import { supabase } from '../supabase'
import { FEEDBACK_AUDIO_BUCKET } from './feedbackAudio'
import { notifyPush } from '../push'
import { toDateKey } from '../game-logic'
import type { PracticeLog } from './types'
import { FEEDBACK_IMAGES_BUCKET } from '../feedbackImages'

export async function fetchOwnLogs(userId: string): Promise<PracticeLog[]> {
  const { data, error } = await supabase
    .from('practice_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PracticeLog[]
}

export async function fetchOwnLogsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('practice_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

export interface WeeklyStats {
  dateKeys: string[]
  weeklyCount: number
}

// today is injectable so callers can compute deterministically in tests.
export async function fetchWeeklyStats(userId: string, today: Date): Promise<WeeklyStats> {
  const dayOfWeek = (today.getDay() + 6) % 7 // 0 = Monday
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek)
  const { data, error } = await supabase
    .from('practice_logs')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', monday.toISOString())
  if (error) throw error
  const dateKeys = (data ?? []).map((row) => toDateKey(new Date(row.created_at as string)))
  return { dateKeys: Array.from(new Set(dateKeys)), weeklyCount: data?.length ?? 0 }
}

// When and how long the pupil practised - all of it, for the calendar and
// the longest streak (a few hundred rows at most per pupil).
export async function fetchPracticeHistory(userId: string): Promise<{ created_at: string; duration_seconds: number | null }[]> {
  const { data, error } = await supabase
    .from('practice_logs')
    .select('created_at, duration_seconds')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    created_at: row.created_at as string,
    duration_seconds: (row.duration_seconds as number | null | undefined) ?? null,
  }))
}

export async function fetchPendingReview(): Promise<PracticeLog[]> {
  const { data, error } = await supabase
    .from('practice_logs')
    .select('*')
    .is('teacher_comment', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PracticeLog[]
}

// Graded recordings the pupil hasn't opened yet (RLS: only their own).
// Needs migration 0036; without it the query fails and no number is shown.
export async function countUnseenFeedback(): Promise<number> {
  const { count, error } = await supabase
    .from('practice_logs')
    .select('id', { count: 'exact', head: true })
    .not('rating', 'is', null)
    .is('feedback_seen_at', null)
  if (error) throw error
  return count ?? 0
}

// The pupil opened these grades (migration 0036's mark_feedback_seen).
export async function markFeedbackSeen(ids: (string | number)[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.rpc('mark_feedback_seen', { p_ids: ids.map(Number) })
  if (error) throw error
}

// How many recordings wait for a grade (for the badge in the teacher's menu).
export async function countPendingReview(): Promise<number> {
  const { count, error } = await supabase
    .from('practice_logs')
    .select('id', { count: 'exact', head: true })
    .is('teacher_comment', null)
  if (error) throw error
  return count ?? 0
}

export async function fetchLogsByIds(ids: string[]): Promise<PracticeLog[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('practice_logs').select('*').in('id', ids)
  if (error) throw error
  return (data ?? []) as PracticeLog[]
}

export async function fetchStudentLogs(studentId: string): Promise<PracticeLog[]> {
  const { data, error } = await supabase
    .from('practice_logs')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PracticeLog[]
}

// A pupil's other recordings of the same assignment or own piece, newest first
// (the teacher compares attempts while grading).
export async function fetchAttempts(log: Pick<PracticeLog, 'id' | 'user_id' | 'assignment_id' | 'own_piece_id'>): Promise<PracticeLog[]> {
  const column = log.assignment_id ? 'assignment_id' : log.own_piece_id ? 'own_piece_id' : undefined
  const value = log.assignment_id ?? log.own_piece_id
  if (!column || !value) return []
  const { data, error } = await supabase
    .from('practice_logs')
    .select('*')
    .eq('user_id', log.user_id)
    .eq(column, value)
    .neq('id', log.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as PracticeLog[]
}

// Every recording of these pupils in a time range (grade export). Asked in
// groups of pupils and pages of 1000 rows, the most the database returns at once.
export async function fetchLogsForExport(studentIds: string[], fromIso: string, toIso: string): Promise<PracticeLog[]> {
  const all: PracticeLog[] = []
  for (let i = 0; i < studentIds.length; i += 100) {
    const group = studentIds.slice(i, i + 100)
    for (let page = 0; ; page++) {
      const { data, error } = await supabase
        .from('practice_logs')
        .select('*')
        .in('user_id', group)
        .gte('created_at', fromIso)
        .lt('created_at', toIso)
        .order('created_at')
        .order('id')
        .range(page * 1000, page * 1000 + 999)
      if (error) throw error
      all.push(...((data ?? []) as PracticeLog[]))
      if (!data || data.length < 1000) break
    }
  }
  return all
}

export interface GradingInput {
  rating: number
  feedback_good: string
  feedback_improve: string
  // Left out = pictures untouched (and no need for migration 0026).
  feedback_images?: string[] | null
  // Left out = untouched (and no need for migration 0037).
  feedback_audio?: string | null
}

export async function submitGrading(logId: string, input: GradingInput, gradedBy: string): Promise<void> {
  // Also fill teacher_comment for backward compatibility with the old
  // single-field model, in case anything still reads it.
  const { error } = await supabase
    .from('practice_logs')
    .update({
      rating: input.rating,
      feedback_good: input.feedback_good,
      feedback_improve: input.feedback_improve,
      teacher_comment: input.feedback_good,
      graded_by: gradedBy,
      ...(input.feedback_images !== undefined ? { feedback_images: input.feedback_images } : {}),
      ...(input.feedback_audio !== undefined ? { feedback_audio: input.feedback_audio } : {}),
    })
    .eq('id', logId)
  if (error) throw error
  notifyPush({ type: 'graded', logId })
}

const RECORDINGS_BUCKET = 'recordings'

// A recording from the in-app recorder is stored as .wav; a file the pupil
// picked keeps its own format (see lib/audio/audioFile.ts).
export async function uploadRecording(
  userId: string,
  blob: Blob,
  format: { extension: string; contentType: string } = { extension: 'wav', contentType: 'audio/wav' },
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.${format.extension}`
  const { error: uploadError } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(fileName, blob, { contentType: format.contentType })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from(RECORDINGS_BUCKET).getPublicUrl(fileName)
  return data.publicUrl
}

// Deletes the recording itself (best-effort - an already-missing storage
// object shouldn't block removing the row) and its practice_logs row.
export async function deletePracticeLog(log: PracticeLog): Promise<void> {
  const marker = `/${RECORDINGS_BUCKET}/`
  const markerIndex = log.audio_url?.indexOf(marker) ?? -1
  if (log.audio_url && markerIndex !== -1) {
    await supabase.storage.from(RECORDINGS_BUCKET).remove([log.audio_url.slice(markerIndex + marker.length)])
  }
  if (log.feedback_images?.length) {
    await supabase.storage.from(FEEDBACK_IMAGES_BUCKET).remove(log.feedback_images)
  }
  if (log.feedback_audio) {
    await supabase.storage.from(FEEDBACK_AUDIO_BUCKET).remove([log.feedback_audio])
  }

  const { error } = await supabase.from('practice_logs').delete().eq('id', log.id)
  if (error) throw error
}

export async function insertPracticeLog(
  userId: string,
  audioUrl: string,
  assignmentId?: string,
  durationSeconds?: number | null,
  note?: string | null,
  ownPieceId?: string,
): Promise<string> {
  const row: Record<string, unknown> = { user_id: userId, audio_url: audioUrl, assignment_id: assignmentId ?? null }
  // Only sent when known, so a database without migration 0024 still accepts the row.
  if (durationSeconds != null) row.duration_seconds = Math.round(durationSeconds)
  // Only when written (migration 0036).
  if (note?.trim()) row.student_note = note.trim().slice(0, 300)
  // Only for an own piece (migration 0039).
  if (ownPieceId) row.own_piece_id = ownPieceId
  const { data, error } = await supabase.from('practice_logs').insert([row]).select('id').single()
  if (error) throw error
  const logId = String(data.id)
  notifyPush({ type: 'recording', logId })
  return logId
}

// The teacher gives (+1) or takes back (-1) one star. The permission check
// (moderator, or the pupil's own verified teacher) lives in the
// teacher_adjust_stars SQL function (migration 0024). Returns the new count.
export async function adjustStudentStars(studentId: string, delta: 1 | -1): Promise<number> {
  const { data, error } = await supabase.rpc('teacher_adjust_stars', { p_student_id: studentId, p_delta: delta })
  if (error) throw error
  return data as number
}

export interface PracticeSessionResult {
  stars: number
  streak: number
  streakFreezesAvailable: number
}

// Awards a star and updates streak (consuming a freeze if a single day was
// missed) atomically server-side. Call once per submitted recording.
export async function recordPracticeSession(userId: string): Promise<PracticeSessionResult> {
  const { data, error } = await supabase.rpc('record_practice_session', { p_user_id: userId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    stars: row.stars,
    streak: row.streak,
    streakFreezesAvailable: row.streak_freezes_available,
  }
}

// Which of the given assignment ids already have a submitted recording
// from this student.
// For the teacher's list of assignments: who each one was given to (empty =
// the whole classroom) and who has sent a recording for it.
export async function fetchAssignmentProgress(
  assignmentIds: string[],
): Promise<{ recipients: Map<string, string[]>; submitted: Map<string, Set<string>> }> {
  const recipients = new Map<string, string[]>()
  const submitted = new Map<string, Set<string>>()
  if (assignmentIds.length === 0) return { recipients, submitted }
  const [recipientsRes, logsRes] = await Promise.all([
    supabase.from('assignment_recipients').select('assignment_id, student_id').in('assignment_id', assignmentIds),
    supabase.from('practice_logs').select('assignment_id, user_id').in('assignment_id', assignmentIds),
  ])
  if (recipientsRes.error) throw recipientsRes.error
  if (logsRes.error) throw logsRes.error
  for (const row of recipientsRes.data ?? []) {
    const id = row.assignment_id as string
    recipients.set(id, [...(recipients.get(id) ?? []), row.student_id as string])
  }
  for (const row of logsRes.data ?? []) {
    const id = row.assignment_id as string
    submitted.set(id, (submitted.get(id) ?? new Set()).add(row.user_id as string))
  }
  return { recipients, submitted }
}

export async function fetchCompletedAssignmentIds(userId: string, assignmentIds: string[]): Promise<Set<string>> {
  if (assignmentIds.length === 0) return new Set()
  const { data, error } = await supabase
    .from('practice_logs')
    .select('assignment_id')
    .eq('user_id', userId)
    .in('assignment_id', assignmentIds)
  if (error) throw error
  return new Set((data ?? []).map((row) => row.assignment_id as string))
}
