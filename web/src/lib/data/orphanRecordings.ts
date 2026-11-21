import { supabase } from '../supabase'

// Lost recordings (migration 0049): sound files no recording points to any
// more, and bringing them back as new ungraded recordings.

export interface OrphanRecording {
  name: string
  user_id: string
  pupil_name: string | null
  created_at: string
  bytes: number
}

const RECORDINGS_BUCKET = 'recordings'

export async function fetchOrphanRecordings(): Promise<OrphanRecording[]> {
  const { data, error } = await supabase.rpc('admin_orphan_recordings')
  if (error) throw error
  return ((data ?? []) as OrphanRecording[]).map((o) => ({ ...o, bytes: Number(o.bytes) }))
}

// Returns how many were restored.
export async function restoreOrphanRecordings(names: string[]): Promise<number> {
  const urls = names.map((name) => supabase.storage.from(RECORDINGS_BUCKET).getPublicUrl(name).data.publicUrl)
  const { data, error } = await supabase.rpc('admin_restore_orphan_recordings', { p_names: names, p_urls: urls })
  if (error) throw error
  return Number(data ?? 0)
}

// Files from the last few days may still be resent by the pupil from their
// phone (Neodeslané nahrávky) - not ticked by default.
export const RECENT_DAYS = 7

export function isRecent(createdAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() < RECENT_DAYS * 24 * 60 * 60 * 1000
}
