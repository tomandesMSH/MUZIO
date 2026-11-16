import { supabase } from '../supabase'

// What notifications a user wants (migration 0035). No row = these defaults.
export interface NotificationSettings {
  graded: boolean
  assignments: boolean
  reminder: boolean
  // Hour in Czech time.
  reminder_hour: number
  recordings: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  graded: true,
  assignments: true,
  reminder: true,
  reminder_hour: 18,
  recordings: true,
}

export const REMINDER_HOURS = [14, 15, 16, 17, 18, 19, 20, 21]

export async function fetchNotificationSettings(userId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('graded, assignments, reminder, reminder_hour, recordings')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data ?? {}) }
}

export async function saveNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  const { error } = await supabase
    .from('notification_settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() })
  if (error) throw error
}
