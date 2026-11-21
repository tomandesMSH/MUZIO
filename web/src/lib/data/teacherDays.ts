import { supabase } from '../supabase'
import { toDateKey } from '../game-logic'

// Days the teacher added by hand: the pupil practised without a recording
// (migration 0057). They count as flames like days with a recording.

export interface TeacherDay {
  day: string // YYYY-MM-DD
  note: string | null
  teacher_id: string | null
}

export const TEACHER_DAY_MAX_BACK = 60

// Empty before migration 0057 (or when not allowed to see them).
export async function fetchTeacherDays(studentId: string): Promise<TeacherDay[]> {
  const { data, error } = await supabase
    .from('teacher_practice_days')
    .select('day, note, teacher_id')
    .eq('student_id', studentId)
    .order('day', { ascending: false })
  if (error) return []
  return (data ?? []) as TeacherDay[]
}

export async function addTeacherDay(studentId: string, day: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('teacher_practice_days')
    .insert({ student_id: studentId, day, note: note.trim() ? note.trim().slice(0, 200) : null })
  if (error) {
    if (error.code === '23505') throw new Error('Tento den už žák plamínek má.')
    throw error
  }
}

export async function removeTeacherDay(studentId: string, day: string): Promise<void> {
  const { error } = await supabase.from('teacher_practice_days').delete().eq('student_id', studentId).eq('day', day)
  if (error) throw error
}

// The oldest day a teacher may add, as YYYY-MM-DD.
export function earliestTeacherDay(today: Date = new Date()): string {
  return toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - TEACHER_DAY_MAX_BACK))
}
