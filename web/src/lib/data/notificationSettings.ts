import { supabase } from '../supabase'

// What notifications a user wants (migration 0035). No row = these defaults.
export interface NotificationSettings {
  graded: boolean
  assignments: boolean
  reminder: boolean
  // Hour in Czech time.
  reminder_hour: number
  recordings: boolean
  // Teachers: one summary a day instead of each recording (migration 0038).
  recordings_digest: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  graded: true,
  assignments: true,
  reminder: true,
  reminder_hour: 18,
  recordings: true,
  recordings_digest: false,
}

export const REMINDER_HOURS = [14, 15, 16, 17, 18, 19, 20, 21]

export async function fetchNotificationSettings(userId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  const row = (data ?? {}) as Partial<NotificationSettings> & Record<string, unknown>
  return {
    graded: row.graded ?? DEFAULT_NOTIFICATION_SETTINGS.graded,
    assignments: row.assignments ?? DEFAULT_NOTIFICATION_SETTINGS.assignments,
    reminder: row.reminder ?? DEFAULT_NOTIFICATION_SETTINGS.reminder,
    reminder_hour: row.reminder_hour ?? DEFAULT_NOTIFICATION_SETTINGS.reminder_hour,
    recordings: row.recordings ?? DEFAULT_NOTIFICATION_SETTINGS.recordings,
    recordings_digest: row.recordings_digest ?? DEFAULT_NOTIFICATION_SETTINGS.recordings_digest,
  }
}

export async function saveNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  const { error } = await supabase
    .from('notification_settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() })
  if (error) throw error
}
