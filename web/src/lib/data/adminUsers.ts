import { supabase } from '../supabase'

// Admin-only account changes. Each one is a SQL function that checks the
// caller is an admin, applies the rules (never on your own account, ...) and
// writes the admin history - see the migrations named in each comment.

// Pupil <-> teacher (migration 0028).
export async function setUserRole(userId: string, role: 'student' | 'teacher'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_role', { p_user_id: userId, p_role: role })
  if (error) throw error
}

// The "Učitel + Admin" flag (migration 0028).
export async function setUserAdmin(userId: string, on: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_moderator', { p_user_id: userId, p_on: on })
  if (error) throw error
}
