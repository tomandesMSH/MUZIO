import { supabase } from '../supabase'
import { FEEDBACK_IMAGES_BUCKET } from '../feedbackImages'

// Admin-only account changes. Each one is a SQL function that checks the
// caller is an admin, applies the rules (never on your own account, ...) and
// writes the admin history - see the migrations named in each comment.

// Pupil <-> teacher (migration 0028).
export async function setUserRole(userId: string, role: 'student' | 'teacher'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_role', { p_user_id: userId, p_role: role })
  if (error) throw error
}

// Full name and sign-in username (migration 0029). The database checks the
// username format and that it's free.
export async function updateAccount(userId: string, fullName: string, username: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_account', {
    p_user_id: userId,
    p_full_name: fullName,
    p_username: username,
  })
  if (error) throw error
}

// The "Učitel + Admin" flag (migration 0028).
export async function setUserAdmin(userId: string, on: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_moderator', { p_user_id: userId, p_on: on })
  if (error) throw error
}

const RECORDINGS_BUCKET = 'recordings'

// Deletes an account completely (migration 0033): an admin any account
// without admin rights, a teacher a pupil from their classes. Storage can't be
// cleaned from SQL, so the files go first - recordings by their folder and by
// the links in the recordings we can see, plus the feedback pictures.
export async function deleteAccount(userId: string): Promise<void> {
  const recordingPaths = new Set<string>()
  const imagePaths: string[] = []

  const { data: listed } = await supabase.storage.from(RECORDINGS_BUCKET).list(userId, { limit: 1000 })
  for (const file of listed ?? []) recordingPaths.add(`${userId}/${file.name}`)

  const { data: logs } = await supabase
    .from('practice_logs')
    .select('audio_url, feedback_images')
    .eq('user_id', userId)
  const marker = `/${RECORDINGS_BUCKET}/`
  for (const log of (logs ?? []) as { audio_url: string | null; feedback_images: string[] | null }[]) {
    const at = log.audio_url?.indexOf(marker) ?? -1
    if (log.audio_url && at !== -1) recordingPaths.add(log.audio_url.slice(at + marker.length))
    imagePaths.push(...(log.feedback_images ?? []))
  }

  if (recordingPaths.size > 0) await supabase.storage.from(RECORDINGS_BUCKET).remove([...recordingPaths])
  if (imagePaths.length > 0) await supabase.storage.from(FEEDBACK_IMAGES_BUCKET).remove(imagePaths)

  const { error } = await supabase.rpc('admin_delete_account', { p_user_id: userId })
  if (error) throw error
}
