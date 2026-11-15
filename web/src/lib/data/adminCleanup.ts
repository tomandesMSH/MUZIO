import { supabase } from '../supabase'

// Clearing out the sound of old graded recordings (migration 0034). The rows
// stay, so grades, XP and badges don't change.

export interface CleanupCandidate {
  id: number
  path: string
  bytes: number
}

const RECORDINGS_BUCKET = 'recordings'
const BATCH = 100

// 1 September of the current school year: everything from earlier school
// years. Before September it's last year's 1 September.
export function defaultCleanupDate(today: Date = new Date()): string {
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1
  return `${year}-09-01`
}

export async function fetchCleanupCandidates(before: string): Promise<CleanupCandidate[]> {
  const { data, error } = await supabase.rpc('admin_cleanup_candidates', { p_before: before })
  if (error) throw error
  return ((data ?? []) as CleanupCandidate[]).map((c) => ({ ...c, id: Number(c.id), bytes: Number(c.bytes) }))
}

// Which recordings may be marked as cleared after a storage remove: those
// whose file was deleted now, and those that had no file any more (0 bytes -
// nothing to delete). A file that failed to delete keeps its recording as is.
export function clearedIds(batch: CleanupCandidate[], deletedPaths: ReadonlySet<string>): number[] {
  return batch.filter((c) => deletedPaths.has(c.path) || c.bytes === 0).map((c) => c.id)
}

// Deletes the files in batches, then marks those recordings. Returns how many
// were cleared.
export async function runCleanup(
  candidates: CleanupCandidate[],
  before: string,
  onProgress?: (done: number) => void,
): Promise<number> {
  let cleared = 0
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH)
    const { data, error } = await supabase.storage.from(RECORDINGS_BUCKET).remove(batch.map((c) => c.path))
    if (error) throw error
    const ids = clearedIds(batch, new Set((data ?? []).map((f) => f.name)))
    if (ids.length > 0) {
      const { data: count, error: markError } = await supabase.rpc('admin_mark_audio_removed', {
        p_ids: ids,
        p_before: before,
      })
      if (markError) throw markError
      cleared += Number(count ?? 0)
    }
    onProgress?.(Math.min(i + BATCH, candidates.length))
  }
  return cleared
}
