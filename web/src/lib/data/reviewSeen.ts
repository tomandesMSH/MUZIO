import { supabase } from '../supabase'

// When the teacher last marked the waiting recordings as read ("Oznámení" ->
// "Označit jako přečtené"). The Dashboard number counts only recordings sent
// after that. Saved in notification_settings (migration 0061) so it is the
// same on every device; before that migration, in this browser only.

const LOCAL_KEY = 'muzio-review-seen-at'

async function myId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id
}

function localSeen(userId: string): string | null {
  try {
    return localStorage.getItem(`${LOCAL_KEY}:${userId}`)
  } catch {
    return null
  }
}

export async function fetchReviewSeenAt(): Promise<string | null> {
  const userId = await myId()
  if (!userId) return null
  const local = localSeen(userId)
  const { data, error } = await supabase
    .from('notification_settings')
    .select('review_badge_seen_at')
    .eq('user_id', userId)
    .maybeSingle()
  const saved = error ? null : ((data?.review_badge_seen_at as string | null | undefined) ?? null)
  // The later of the two (another device may have marked it since).
  if (!saved) return local
  if (!local) return saved
  return Date.parse(saved) > Date.parse(local) ? saved : local
}

export async function markReviewSeen(now: Date = new Date()): Promise<void> {
  const userId = await myId()
  if (!userId) return
  const iso = now.toISOString()
  try {
    localStorage.setItem(`${LOCAL_KEY}:${userId}`, iso)
  } catch {
    // Private mode: the database copy still works.
  }
  // Without migration 0061 the column isn't there; the browser copy is enough then.
  await supabase.from('notification_settings').upsert({ user_id: userId, review_badge_seen_at: iso })
}
