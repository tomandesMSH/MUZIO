import { supabase } from '../supabase'

// History of admin actions (migration 0027). Written only by the database;
// the app just reads it, and only admins may.

export interface AdminAction {
  id: number
  created_at: string
  actor_id: string | null
  actor_name: string | null
  action: string
  target_user_id: string | null
  target_name: string | null
  details: Record<string, unknown>
}

export async function fetchAdminActions(limit = 200): Promise<AdminAction[]> {
  const { data, error } = await supabase
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AdminAction[]
}

const ROLE_NAMES: Record<string, string> = { student: 'žák', teacher: 'učitel', moderator: 'moderátor' }

// One line per entry, e.g. "zabanoval(a) účet". Unknown actions (added by a
// newer migration than this app knows) still show their raw name.
export function describeAction(entry: Pick<AdminAction, 'action' | 'details'>): string {
  const d = entry.details ?? {}
  switch (entry.action) {
    case 'verify_teacher':
      return 'ověřil(a) učitele'
    case 'unverify_teacher':
      return 'zrušil(a) ověření učitele'
    case 'approve_student':
      return 'schválil(a) žáka'
    case 'ban':
      return 'zabanoval(a) účet'
    case 'unban':
      return 'odbanoval(a) účet'
    case 'reset_password':
      return 'nastavil(a) nové heslo'
    case 'delete_recording':
      return 'smazal(a) nahrávku'
    case 'set_role':
      return `změnil(a) roli: ${ROLE_NAMES[String(d.from)] ?? d.from} → ${ROLE_NAMES[String(d.to)] ?? d.to}`
    case 'grant_admin':
      return 'dal(a) práva admina'
    case 'revoke_admin':
      return 'odebral(a) práva admina'
    case 'edit_account':
      return [
        'upravil(a) účet',
        d.full_name_to ? `jméno: ${d.full_name_from} → ${d.full_name_to}` : '',
        d.username_to ? `přihlašovací jméno: ${d.username_from} → ${d.username_to}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    case 'adjust_stars':
      return `${Number(d.delta) > 0 ? 'přidal(a)' : 'odebral(a)'} hvězdu (teď ${d.stars})`
    case 'delete_account':
      return `smazal(a) účet${d.username ? ` ${d.username}` : ''}`
    case 'delete_classroom':
      return `smazal(a) třídu ${d.classroom ?? ''}`.trim()
    case 'move_student':
      return d.from ? `přesunul(a) žáka: ${d.from} → ${d.to}` : `přidal(a) žáka do třídy ${d.to}`
    case 'transfer_classroom':
      return `předal(a) třídu ${d.classroom} (od: ${d.from ?? '-'})`
    case 'remove_from_classroom':
      return `odebral(a) žáka ze třídy ${d.classroom ?? ''}`.trim()
    case 'announce_cleanup':
      return `oznámil(a) čištění nahrávek (od ${d.delete_after})`
    case 'cleanup_recordings':
      return `uklidil(a) ${d.count} starých nahrávek (do ${d.before})`
    default:
      return entry.action
  }
}
