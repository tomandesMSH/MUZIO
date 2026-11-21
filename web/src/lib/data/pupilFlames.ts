import { supabase } from '../supabase'

// A pupil's flames for their teacher (migration 0051): only days and counts,
// the recordings stay private.

export async function fetchPupilFlameDays(studentId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('pupil_flame_days', { p_student: studentId })
  if (error) throw error
  return ((data ?? []) as { day: string }[]).map((r) => String(r.day))
}

export async function fetchPupilFlameCounts(studentIds: string[]): Promise<Map<string, number>> {
  if (studentIds.length === 0) return new Map()
  const { data, error } = await supabase.rpc('pupil_flame_counts', { p_students: studentIds })
  if (error) throw error
  return new Map(((data ?? []) as { student_id: string; days: number }[]).map((r) => [r.student_id, Number(r.days)]))
}

// Flames brought over from the Base44 app (migration 0055); 0 for everyone
// else, and before that migration.
export async function fetchImportedFlames(studentId: string): Promise<number> {
  const { data, error } = await supabase.rpc('imported_flames', { p_student: studentId })
  if (error) return 0
  return Number(data ?? 0)
}
