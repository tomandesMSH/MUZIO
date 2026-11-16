import { supabase } from '../supabase'
import { notifyPush } from '../push'

// Announcements for a class (migration 0041).
export const ANNOUNCEMENT_MAX = 1000

export interface Announcement {
  id: string
  classroom_id: string
  teacher_id: string
  body: string
  created_at: string
  // Filled in for pupils: the class name.
  classroom_name?: string
}

export async function fetchClassAnnouncements(classroomId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('classroom_announcements')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as Announcement[]
}

// A pupil's announcements from the last days, from all their classes (RLS
// only returns the classes they're in).
export async function fetchMyAnnouncements(days = 14): Promise<Announcement[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('classroom_announcements')
    .select('*, classrooms(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as (Announcement & { classrooms: { name: string } | null })[]).map(({ classrooms, ...a }) => ({
    ...a,
    classroom_name: classrooms?.name,
  }))
}

export async function postAnnouncement(classroomId: string, teacherId: string, body: string): Promise<void> {
  const { data, error } = await supabase
    .from('classroom_announcements')
    .insert({ classroom_id: classroomId, teacher_id: teacherId, body: body.trim().slice(0, ANNOUNCEMENT_MAX) })
    .select('id')
    .single()
  if (error) throw error
  notifyPush({ type: 'announcement', announcementId: String(data.id) })
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('classroom_announcements').delete().eq('id', id)
  if (error) throw error
}
