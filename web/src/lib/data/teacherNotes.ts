import { supabase } from '../supabase'

// A teacher's private notes about a pupil (migration 0040). Only the teacher
// who wrote them can read them.
export const NOTE_MAX = 4000

export interface TeacherNote {
  body: string
  updated_at: string
}

// The note, or undefined when there is none yet. Throws without migration 0040.
export async function fetchTeacherNote(teacherId: string, studentId: string): Promise<TeacherNote | undefined> {
  const { data, error } = await supabase
    .from('teacher_student_notes')
    .select('body, updated_at')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw error
  return (data as TeacherNote | null) ?? undefined
}

export async function saveTeacherNote(teacherId: string, studentId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('teacher_student_notes')
    .upsert(
      { teacher_id: teacherId, student_id: studentId, body: body.slice(0, NOTE_MAX), updated_at: new Date().toISOString() },
      { onConflict: 'teacher_id,student_id' },
    )
  if (error) throw error
}
