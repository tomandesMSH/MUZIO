import { supabase } from '../supabase'

// How much of the Supabase plan MUZIO uses (migration 0032).

export interface Usage {
  database_bytes: number
  buckets: { bucket: string; files: number; bytes: number }[]
  top_pupils: { id: string; name: string | null; files: number; bytes: number }[]
  counts: { students: number; teachers: number; recordings: number }
}

// Supabase free plan limits (supabase.com/pricing, checked 11/2026). The API
// doesn't report the plan, so they live here; change them on an upgrade.
export const FREE_DATABASE_BYTES = 500 * 1024 * 1024
export const FREE_STORAGE_BYTES = 1024 * 1024 * 1024

export const BUCKET_NAMES: Record<string, string> = {
  recordings: 'Nahrávky',
  'feedback-images': 'Obrázky k hodnocení',
  'assignment-files': 'Přílohy úkolů',
}

export async function fetchUsage(): Promise<Usage> {
  const { data, error } = await supabase.rpc('admin_usage')
  if (error) throw error
  return data as Usage
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} kB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} GB`
}

// 0-1 of a limit, and how worried to be about it.
export function usageLevel(used: number, limit: number): { share: number; tone: 'ok' | 'warn' | 'full' } {
  const share = limit > 0 ? used / limit : 0
  return { share, tone: share >= 0.9 ? 'full' : share >= 0.7 ? 'warn' : 'ok' }
}
