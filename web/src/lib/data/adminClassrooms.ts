import { supabase } from '../supabase'
import { ASSIGNMENT_FILES_BUCKET } from '../attachments'
import type { Classroom } from './types'

// Every teacher's classes, for the admin (migration 0031).

export interface ClassroomMember {
  classroom_id: string
  student_id: string
}

export async function fetchAllClassrooms(): Promise<Classroom[]> {
  const { data, error } = await supabase.from('classrooms').select('*').order('name')
  if (error) throw error
  return (data ?? []) as Classroom[]
}

export async function fetchAllClassroomMembers(): Promise<ClassroomMember[]> {
  const { data, error } = await supabase.from('classroom_members').select('classroom_id, student_id')
  if (error) throw error
  return (data ?? []) as ClassroomMember[]
}

// from = null adds the pupil to a class, to = null takes them out.
export async function moveStudent(studentId: string, from: string | null, to: string | null): Promise<void> {
  const { error } = await supabase.rpc('admin_move_student', { p_student_id: studentId, p_from: from, p_to: to })
  if (error) throw error
}

export async function transferClassroom(classroomId: string, teacherId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_transfer_classroom', { p_classroom_id: classroomId, p_teacher_id: teacherId })
  if (error) throw error
}

// The assignment files live in storage, which the database can't clean up
// itself, so they go first; then the class (members, assignments) itself.
export async function deleteClassroomAsAdmin(classroomId: string): Promise<void> {
  const { data, error } = await supabase
    .from('assignments')
    .select('attachment_path')
    .eq('classroom_id', classroomId)
    .not('attachment_path', 'is', null)
  if (error) throw error
  const paths = (data ?? []).map((a) => a.attachment_path as string)
  if (paths.length > 0) await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove(paths)

  const { error: rpcError } = await supabase.rpc('admin_delete_classroom', { p_classroom_id: classroomId })
  if (rpcError) throw rpcError
}
