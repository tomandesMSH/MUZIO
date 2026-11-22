import { supabase } from '../supabase'
import { recordedFormat } from '../audio/audioFile'

// The teacher's spoken comment on a grade (migration 0037): one short
// recording per graded recording, "<practice_log_id>/<time>.<m4a|webm>" in a private
// bucket. Who may add, hear and remove it is up to the storage policies.
export const FEEDBACK_AUDIO_BUCKET = 'feedback-audio'
export const MAX_VOICE_SECONDS = 60

export async function uploadFeedbackAudio(logId: string | number, audio: Blob): Promise<string> {
  const { extension, contentType } = recordedFormat(audio.type)
  const path = `${logId}/${Date.now()}.${extension}`
  const { error } = await supabase.storage.from(FEEDBACK_AUDIO_BUCKET).upload(path, audio, { contentType })
  if (error) throw error
  return path
}

// Best effort, like the pictures: a leftover file is harmless.
export async function removeFeedbackAudio(path: string | null | undefined): Promise<void> {
  if (!path) return
  await supabase.storage.from(FEEDBACK_AUDIO_BUCKET).remove([path])
}

// A link to play it, valid for an hour.
export async function fetchFeedbackAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(FEEDBACK_AUDIO_BUCKET).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}
