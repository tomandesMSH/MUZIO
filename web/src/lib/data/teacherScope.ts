import { supabase } from '../supabase'

// The teacher panel shows the teacher's own pupils - the ones in their
// classrooms. A plain teacher gets exactly that from RLS. A teacher who is
// also an admin (is_moderator) can read every pupil and recording in the
// school (0019), which mixed the whole school into their teacher panel; for
// them the panel narrows it down here. The admin panel keeps seeing everything.
//
// undefined = no narrowing needed (plain teacher), otherwise the pupil ids.

// Kept a minute, so a pupil who just joined a classroom shows up soon.
const MAX_AGE_MS = 60_000
let cached: { userId: string; at: number; ids: Promise<Set<string> | undefined> } | undefined

async function load(userId: string): Promise<Set<string> | undefined> {
  const { data: me, error: meError } = await supabase.from('profiles').select('is_moderator').eq('id', userId).maybeSingle()
  if (meError) throw meError
  if (!me?.is_moderator) return undefined
  const { data: classes, error: classError } = await supabase.from('classrooms').select('id').eq('teacher_id', userId)
  if (classError) throw classError
  const classIds = (classes ?? []).map((c) => c.id as string)
  if (classIds.length === 0) return new Set()
  const { data: members, error } = await supabase.from('classroom_members').select('student_id').in('classroom_id', classIds)
  if (error) throw error
  return new Set((members ?? []).map((m) => m.student_id as string))
}

export async function myPupilScope(): Promise<Set<string> | undefined> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return undefined
  if (cached?.userId !== userId || Date.now() - cached.at > MAX_AGE_MS) {
    const ids = load(userId)
    cached = { userId, at: Date.now(), ids }
    // A failure is retried next time instead of being remembered.
    ids.catch(() => {
      if (cached?.ids === ids) cached = undefined
    })
  }
  return cached.ids
}

// For tests.
export function resetPupilScope() {
  cached = undefined
}
