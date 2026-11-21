// The look the pupil picked (migration 0044): a fairy-tale world with a
// teddy bear, or a modern studio with a young musician.
import { supabase } from './supabase'

export type StyleId = 'pohadka' | 'studio'

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'pohadka', label: 'Pohádkový svět' },
  { id: 'studio', label: 'Moderní studio' },
]

export const DEFAULT_STYLE: StyleId = 'pohadka'

export function styleOf(value: string | null | undefined): StyleId {
  return value === 'studio' ? 'studio' : DEFAULT_STYLE
}

export async function updateStyle(userId: string, style: StyleId): Promise<void> {
  const { error } = await supabase.from('profiles').update({ style }).eq('id', userId)
  if (error) throw error
}
