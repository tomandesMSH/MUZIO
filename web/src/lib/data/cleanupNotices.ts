import { supabase } from '../supabase'
import { toDateKey } from '../game-logic'
import { notifyPush } from '../push'

// Notices that old sound files are about to be cleared (migration 0046).
// Row level security decides who sees which: every pupil the admin's
// "Oznámit čištění", only the owners the automatic one about the largest files.

export interface CleanupNotice {
  id: string
  kind: 'all' | 'largest'
  delete_after: string // YYYY-MM-DD
  created_at: string
}

// Notices still open today, the nearest clearing first.
export async function fetchOpenCleanupNotices(today: Date): Promise<CleanupNotice[]> {
  const { data, error } = await supabase
    .from('cleanup_notices')
    .select('id, kind, delete_after, created_at')
    .gte('delete_after', toDateKey(today))
    .order('delete_after', { ascending: true })
  if (error) throw error
  return (data ?? []) as CleanupNotice[]
}

// "1. 12." for the banner.
export function noticeDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

// "Oznámit čištění" (admin): the notice, then the notification to every pupil.
export async function announceCleanup(): Promise<string> {
  const { data, error } = await supabase.rpc('admin_announce_cleanup')
  if (error) throw error
  const id = data as string
  notifyPush({ type: 'cleanup', noticeId: id })
  return id
}
