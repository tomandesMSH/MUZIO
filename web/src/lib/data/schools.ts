import { supabase } from '../supabase'

// Schools and the links that bring their admin and teachers in
// (migrations 0064, 0067). The page behind a link is /skola/<kód>.

export type SchoolInviteRole = 'school_admin' | 'teacher'

export interface SchoolRow {
  id: string
  name: string
  is_active: boolean
  created_at: string
  is_default: boolean
  teachers: number
  pupils: number
  classrooms: number
  admins: string[]
}

export interface SchoolInvite {
  id: string
  school_id: string
  role: SchoolInviteRole
  code: string
  expires_at: string | null
  created_at: string
}

export interface SchoolInviteInfo {
  school_name: string
  role: SchoolInviteRole
  valid: boolean
}

export const INVITE_ROLE_NAMES: Record<SchoolInviteRole, string> = {
  school_admin: 'správce školy',
  teacher: 'učitel',
}

export function schoolLink(code: string, origin: string = window.location.origin): string {
  return `${origin}/skola/${encodeURIComponent(code)}`
}

export async function fetchSchools(): Promise<SchoolRow[]> {
  const { data, error } = await supabase.rpc('admin_schools')
  if (error) throw error
  return (data ?? []) as SchoolRow[]
}

export async function createSchool(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_school', { p_name: name })
  if (error) throw error
  return data as string
}

// Open invites (not used, not expired), newest first.
export async function fetchOpenInvites(): Promise<SchoolInvite[]> {
  const { data, error } = await supabase
    .from('school_invites')
    .select('id, school_id, role, code, expires_at, created_at')
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SchoolInvite[]
}

export async function createSchoolInvite(schoolId: string, role: SchoolInviteRole): Promise<string> {
  const { data, error } = await supabase.rpc('create_school_invite', { p_school: schoolId, p_role: role })
  if (error) throw error
  return data as string
}

export async function cancelSchoolInvite(id: string): Promise<void> {
  const { data, error } = await supabase.from('school_invites').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Pozvánku se nepovedlo zrušit.')
}

export async function fetchSchoolInviteInfo(code: string): Promise<SchoolInviteInfo | null> {
  const { data, error } = await supabase.rpc('school_invite_info', { p_code: code })
  if (error) throw error
  const rows = (data ?? []) as SchoolInviteInfo[]
  return rows[0] ?? null
}

export async function redeemSchoolInvite(code: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_school_invite', { p_code: code })
  if (error) throw error
}

// The link waits in this browser while the teacher signs in or registers
// (same as the class link, see JoinByLink).
const PENDING_KEY = 'muzio-school-code'

export function rememberSchoolCode(code: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, code)
  } catch {
    // Private mode: they open the link again after signing in.
  }
}

export function peekSchoolCode(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

export function takeSchoolCode(): string | null {
  const code = peekSchoolCode()
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Nothing stored.
  }
  return code
}
