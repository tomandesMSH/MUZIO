import { supabase } from '../supabase'
import { notifyPush } from '../push'

// Inviting a pupil into a class (migration 0062). The class link
// (/pripojit/<kód>) is the other way in and uses joinClassroom.

export interface PupilHit {
  id: string
  full_name: string
  is_member: boolean
  is_invited: boolean
}

export interface SentInvite {
  id: string
  student_id: string
  full_name: string
  created_at: string
}

export interface MyInvite {
  id: string
  classroom_name: string
  teacher_name: string | null
  created_at: string
}

export function classroomLink(code: string, origin: string = window.location.origin): string {
  return `${origin}/pripojit/${encodeURIComponent(code)}`
}

export async function searchSchoolPupils(classroomId: string, query: string): Promise<PupilHit[]> {
  if (query.trim().length < 2) return []
  const { data, error } = await supabase.rpc('search_school_pupils', { p_classroom: classroomId, p_query: query.trim() })
  if (error) throw error
  return (data ?? []) as PupilHit[]
}

export async function inviteToClassroom(classroomId: string, studentId: string): Promise<void> {
  const { data, error } = await supabase.rpc('invite_to_classroom', { p_classroom: classroomId, p_student: studentId })
  if (error) throw error
  notifyPush({ type: 'invite', inviteId: String(data) })
}

export async function cancelClassroomInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_classroom_invite', { p_invite: inviteId })
  if (error) throw error
}

// The class's open invitations, for the teacher.
export async function fetchSentInvites(classroomId: string): Promise<SentInvite[]> {
  const { data, error } = await supabase.rpc('classroom_sent_invites', { p_classroom: classroomId })
  if (error) throw error
  return (data ?? []) as SentInvite[]
}

// The pupil's open invitations. Before migration 0062: none.
export async function fetchMyInvites(): Promise<MyInvite[]> {
  const { data, error } = await supabase.rpc('my_classroom_invites')
  if (error) return []
  return (data ?? []) as MyInvite[]
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_classroom_invite', { p_invite: inviteId, p_accept: accept })
  if (error) throw error
}
