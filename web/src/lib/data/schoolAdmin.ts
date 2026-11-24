import { supabase } from '../supabase'

// What the school admin panel shows about their school (migration 0068).

export interface SchoolTeacher {
  id: string
  full_name: string
  username: string | null
  is_verified: boolean
  is_school_admin: boolean
  classrooms: number
}

export interface SchoolPupil {
  id: string
  full_name: string
  username: string | null
  is_approved: boolean
  is_banned: boolean
  created_at: string | null
  classrooms: string[]
}

export interface SchoolClassroom {
  id: string
  name: string
  teacher: string | null
  members: number
}

export interface SchoolOverview {
  school: { id: string; name: string } | null
  teachers: SchoolTeacher[]
  pupils: SchoolPupil[]
  classrooms: SchoolClassroom[]
}

export async function fetchSchoolOverview(): Promise<SchoolOverview> {
  const { data, error } = await supabase.rpc('school_admin_overview')
  if (error) throw error
  return data as SchoolOverview
}
