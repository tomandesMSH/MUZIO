import { supabase } from '../supabase'
import { FEEDBACK_IMAGES_BUCKET, feedbackImagePath } from '../feedbackImages'

// Storage for the teacher's feedback pictures (migration 0026). Who may
// upload, see and delete is decided by the storage policies.

export async function uploadFeedbackImage(logId: string | number, image: Blob): Promise<string> {
  const path = feedbackImagePath(logId)
  const { error } = await supabase.storage
    .from(FEEDBACK_IMAGES_BUCKET)
    .upload(path, image, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

// Best effort: a leftover file is harmless (nobody links to it), a failed
// cleanup shouldn't undo a grade that was saved.
export async function removeFeedbackImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await supabase.storage.from(FEEDBACK_IMAGES_BUCKET).remove(paths)
}

// Short-lived links to show the pictures; the bucket is private.
export async function fetchFeedbackImageUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await supabase.storage.from(FEEDBACK_IMAGES_BUCKET).createSignedUrls(paths, 60 * 60)
  if (error) throw error
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return urls
}
