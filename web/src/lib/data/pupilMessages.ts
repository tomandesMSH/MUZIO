import { supabase } from '../supabase'
import { notifyPush } from '../push'

// Hudební pošta: a teacher's message to one pupil (migration 0052).
export const MESSAGE_MAX = 1000

export interface PupilMessage {
  id: string
  // Null for the messages brought over from Base44 (migration 0059).
  teacher_id: string | null
  student_id: string
  body: string
  created_at: string
  read_at: string | null
}

// The teacher's messages to one pupil, newest first.
export async function fetchMessagesTo(studentId: string): Promise<PupilMessage[]> {
  const { data, error } = await supabase
    .from('pupil_messages')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as PupilMessage[]
}

export async function sendMessage(teacherId: string, studentId: string, body: string): Promise<void> {
  const { data, error } = await supabase
    .from('pupil_messages')
    .insert({ teacher_id: teacherId, student_id: studentId, body: body.trim().slice(0, MESSAGE_MAX) })
    .select('id')
    .single()
  if (error) throw error
  notifyPush({ type: 'message', messageId: String(data.id) })
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('pupil_messages').delete().eq('id', id)
  if (error) throw error
}

// The pupil's mail: unread ones, and read ones from the last 14 days. The
// teacher's name comes from fetchMyTeacherNames (pupils can't read profiles).
export async function fetchMyMessages(studentId: string, days = 14): Promise<PupilMessage[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('pupil_messages')
    .select('*')
    .eq('student_id', studentId)
    .or(`read_at.is.null,created_at.gte."${since}"`)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as PupilMessage[]
}

export async function countUnreadMessages(): Promise<number> {
  const { data: auth } = await supabase.auth.getSession()
  const userId = auth.session?.user.id
  if (!userId) return 0
  const { count, error } = await supabase
    .from('pupil_messages')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markMessageRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_message_read', { p_id: id })
  if (error) throw error
}
