import { supabase } from '../supabase'
import { notifyPush } from '../push'
import { ASSIGNMENT_FILES_BUCKET, attachmentContentType, attachmentPath } from '../attachments'
import type { Assignment, Classroom } from './types'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

export async function createClassroom(teacherId: string, name: string): Promise<Classroom> {
  const joinCode = generateCode()
  const { data, error } = await supabase
    .from('classrooms')
    .insert([{ teacher_id: teacherId, name, join_code: joinCode }])
    .select()
    .single()
  if (error) throw error
  return data as Classroom
}

export async function fetchTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Classroom[]
}

// For filtering "Ke kontrole": the teacher's classes with their pupils, and
// the titles of the given assignments.
export async function fetchReviewContext(
  teacherId: string,
  assignmentIds: string[],
): Promise<{ classrooms: Classroom[]; membersOf: Map<string, Set<string>>; titles: Map<string, string> }> {
  const classrooms = await fetchTeacherClassrooms(teacherId)
  const [membersRes, titlesRes] = await Promise.all([
    classrooms.length
      ? supabase.from('classroom_members').select('classroom_id, student_id').in('classroom_id', classrooms.map((c) => c.id))
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase.from('assignments').select('id, title').in('id', assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (membersRes.error) throw membersRes.error
  if (titlesRes.error) throw titlesRes.error
  const membersOf = new Map<string, Set<string>>()
  for (const row of (membersRes.data ?? []) as { classroom_id: string; student_id: string }[]) {
    membersOf.set(row.classroom_id, (membersOf.get(row.classroom_id) ?? new Set()).add(row.student_id))
  }
  const titles = new Map(((titlesRes.data ?? []) as { id: string; title: string }[]).map((a) => [a.id, a.title]))
  return { classrooms, membersOf, titles }
}

export async function deleteClassroom(classroomId: string): Promise<void> {
  // The assignments go with the classroom (on delete cascade), their files
  // don't: remove them first. Best-effort - a leftover file is only clutter.
  const { data: withFiles } = await supabase
    .from('assignments')
    .select('attachment_path')
    .eq('classroom_id', classroomId)
    .not('attachment_path', 'is', null)
  const paths = ((withFiles ?? []) as { attachment_path: string }[]).map((a) => a.attachment_path)
  if (paths.length > 0) await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove(paths)

  const { error } = await supabase.from('classrooms').delete().eq('id', classroomId)
  if (error) throw error
}

export async function fetchClassroomMemberIds(classroomId: string): Promise<string[]> {
  const { data, error } = await supabase.from('classroom_members').select('student_id').eq('classroom_id', classroomId)
  if (error) throw error
  return (data ?? []).map((row) => row.student_id as string)
}

// Which of this teacher's own classrooms a given student is a member of -
// used to scope "assign a task to this student" to a classroom they can
// actually see it in (assignments are always classroom-scoped).
export async function fetchStudentClassroomsForTeacher(teacherId: string, studentId: string): Promise<Classroom[]> {
  const teacherClassrooms = await fetchTeacherClassrooms(teacherId)
  if (teacherClassrooms.length === 0) return []
  const { data, error } = await supabase
    .from('classroom_members')
    .select('classroom_id')
    .eq('student_id', studentId)
    .in(
      'classroom_id',
      teacherClassrooms.map((c) => c.id),
    )
  if (error) throw error
  const memberOf = new Set((data ?? []).map((row) => row.classroom_id as string))
  return teacherClassrooms.filter((c) => memberOf.has(c.id))
}

export async function removeClassroomMember(classroomId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('classroom_members')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
  if (error) throw error
}

// A student never sees the roster (see 0009 migration) - only the
// classrooms they belong to.
export async function fetchStudentClassrooms(studentId: string): Promise<Classroom[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*, classroom_members!inner(student_id)')
    .eq('classroom_members.student_id', studentId)
  if (error) throw error
  return (data ?? []) as Classroom[]
}

export async function joinClassroom(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_classroom', { p_code: code.trim().toUpperCase() })
  if (error) throw error
  return data as string
}

export async function leaveClassroom(classroomId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('classroom_members')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
  if (error) throw error
}

export interface CreateAssignmentInput {
  classroomId: string
  teacherId: string
  title: string
  description: string
  // Omit or empty = whole classroom.
  recipientIds?: string[]
  // Optional score for Keyboard Utils (already checked with validateAttachment).
  attachment?: File | null
  // "YYYY-MM-DD"; empty or omitted = no deadline (and no need for migration 0036).
  dueDate?: string
  // "Zadat znovu": the score of an existing assignment, copied in storage.
  copyAttachmentFrom?: { path: string; name: string }
}

export async function createAssignment(input: CreateAssignmentInput): Promise<void> {
  const { data, error } = await supabase
    .from('assignments')
    .insert([
      {
        classroom_id: input.classroomId,
        teacher_id: input.teacherId,
        title: input.title,
        description: input.description || null,
        ...(input.dueDate ? { due_date: input.dueDate } : {}),
      },
    ])
    .select()
    .single()
  if (error) throw error

  if (input.recipientIds && input.recipientIds.length > 0) {
    const { error: recipientsError } = await supabase
      .from('assignment_recipients')
      .insert(input.recipientIds.map((studentId) => ({ assignment_id: data.id, student_id: studentId })))
    if (recipientsError) throw recipientsError
  }

  if (input.copyAttachmentFrom && !input.attachment) {
    try {
      await copyAttachment(data.id as string, input.copyAttachmentFrom)
    } catch (err) {
      await supabase.from('assignments').delete().eq('id', data.id)
      throw err
    }
  }

  if (input.attachment) {
    try {
      await attachToAssignment(data.id as string, input.attachment)
    } catch (err) {
      // No half-made assignment: without its file the teacher would have to
      // find and delete it. Removing it lets them simply try again.
      await supabase.from('assignments').delete().eq('id', data.id)
      throw err
    }
  }

  notifyPush({ type: 'assignment', assignmentId: String(data.id) })
}

export type AttachmentChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; file: File }

export interface AssignmentUpdate {
  title: string
  description: string
  // "YYYY-MM-DD", or '' for no deadline.
  dueDate: string
  attachment: AttachmentChange
}

// The teacher fixes an assignment: text, deadline, the attached score.
export async function updateAssignment(assignment: Assignment, update: AssignmentUpdate): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .update({
      title: update.title.trim(),
      description: update.description.trim() || null,
      due_date: update.dueDate || null,
    })
    .eq('id', assignment.id)
  if (error) throw error

  const oldPath = assignment.attachment_path
  if (update.attachment.kind === 'replace') {
    const newPath = attachmentPath(assignment.id, update.attachment.file.name)
    // Storage has no update policy (0023), so a file of the same name can't be
    // overwritten: remove it first.
    if (oldPath === newPath) await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([oldPath])
    await attachToAssignment(assignment.id, update.attachment.file)
    if (oldPath && oldPath !== newPath) await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([oldPath])
  } else if (update.attachment.kind === 'remove' && oldPath) {
    const { error: clearError } = await supabase
      .from('assignments')
      .update({ attachment_path: null, attachment_name: null })
      .eq('id', assignment.id)
    if (clearError) throw clearError
    // Best effort: an orphaned file is harmless, nothing points at it.
    await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([oldPath])
  }
}

// Deletes an assignment. The recordings made for it stay with the pupils (no
// longer tied to it - migration 0037); its score is removed from storage.
export async function deleteAssignment(assignment: Pick<Assignment, 'id' | 'attachment_path'>): Promise<void> {
  const { error } = await supabase.from('assignments').delete().eq('id', assignment.id)
  if (error) throw error
  if (assignment.attachment_path) {
    // Best effort: nothing points at the file any more.
    await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([assignment.attachment_path])
  }
}

async function copyAttachment(assignmentId: string, from: { path: string; name: string }): Promise<void> {
  const path = attachmentPath(assignmentId, from.name)
  const { error: copyError } = await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).copy(from.path, path)
  if (copyError) throw copyError
  const { error } = await supabase
    .from('assignments')
    .update({ attachment_path: path, attachment_name: from.name })
    .eq('id', assignmentId)
  if (error) {
    await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([path])
    throw error
  }
}

async function attachToAssignment(assignmentId: string, file: File): Promise<void> {
  const path = attachmentPath(assignmentId, file.name)
  const { error: uploadError } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .upload(path, file, { contentType: attachmentContentType(file.name), upsert: true })
  if (uploadError) throw uploadError
  const { error } = await supabase
    .from('assignments')
    .update({ attachment_path: path, attachment_name: file.name })
    .eq('id', assignmentId)
  if (error) {
    await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([path])
    throw error
  }
}

// A short-lived link that downloads the assignment's file under its original
// name. Signed, because the bucket is private (see migration 0023).
export async function fetchAttachmentDownloadUrl(assignment: Pick<Assignment, 'attachment_path' | 'attachment_name'>): Promise<string> {
  if (!assignment.attachment_path) throw new Error('Úkol nemá přiložený soubor.')
  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .createSignedUrl(assignment.attachment_path, 60 * 5, { download: assignment.attachment_name ?? true })
  if (error) throw error
  return data.signedUrl
}

export async function fetchClassroomAssignments(classroomId: string): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Assignment[]
}

// RLS on the assignments table already only returns rows this student is
// meant to see (whole-classroom or individually targeted) - no client-side
// filtering needed here.
export async function fetchStudentAssignments(): Promise<Assignment[]> {
  const [assignmentsRes, teachersRes] = await Promise.all([
    supabase.from('assignments').select('*').order('created_at', { ascending: false }),
    // Only id + full_name (never username) - see migration 0022. A failure
    // here (e.g. migration not applied yet) just hides the teacher name.
    supabase.rpc('my_classroom_teacher_names'),
  ])
  if (assignmentsRes.error) throw assignmentsRes.error
  const names = new Map<string, string>(
    ((teachersRes.data ?? []) as { teacher_id: string; full_name: string }[]).map((t) => [t.teacher_id, t.full_name]),
  )
  return ((assignmentsRes.data ?? []) as Assignment[]).map((a) => ({
    ...a,
    teacher_name: names.get(a.teacher_id) ?? null,
  }))
}
