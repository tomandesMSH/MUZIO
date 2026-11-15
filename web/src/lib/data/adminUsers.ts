import { supabase } from '../supabase'

// Admin-only account changes. Each one is a SQL function that checks the
// caller is an admin, applies the rules (never on your own account, ...) and
// writes the admin history - see the migrations named in each comment.

// Pupil <-> teacher (migration 0028).
export async function setUserRole(userId: string, role: 'student' | 'teacher'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_role', { p_user_id: userId, p_role: role })
  if (error) throw error
}

// Full name and sign-in username (migration 0029). The database checks the
// username format and that it's free.
export async function updateAccount(userId: string, fullName: string, username: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_account', {
    p_user_id: userId,
    p_full_name: fullName,
    p_username: username,
  })
  if (error) throw error
}

// The "Učitel + Admin" flag (migration 0028).
export async function setUserAdmin(userId: string, on: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_moderator', { p_user_id: userId, p_on: on })
  if (error) throw error
}
