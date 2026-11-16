import { supabase } from '../supabase'

// A piece the pupil chose to practise (issue #4, migration 0039).
export interface OwnPiece {
  id: string
  student_id: string
  title: string
  link: string | null
  created_at: string
  archived_at: string | null
}

export const OWN_PIECE_TITLE_MAX = 120

// Null when the link is fine (or empty), otherwise why not.
export function validatePieceLink(link: string): string | null {
  const value = link.trim()
  if (!value) return null
  if (!/^https:\/\//i.test(value)) return 'Odkaz musí začínat https:// (třeba z YouTube).'
  if (value.length > 500) return 'Odkaz je moc dlouhý.'
  return null
}

export async function fetchOwnPieces(studentId: string): Promise<OwnPiece[]> {
  const { data, error } = await supabase
    .from('own_pieces')
    .select('*')
    .eq('student_id', studentId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OwnPiece[]
}

export async function addOwnPiece(studentId: string, title: string, link: string): Promise<OwnPiece> {
  const { data, error } = await supabase
    .from('own_pieces')
    .insert({ student_id: studentId, title: title.trim().slice(0, OWN_PIECE_TITLE_MAX), link: link.trim() || null })
    .select('*')
    .single()
  if (error) throw error
  return data as OwnPiece
}

// "Hotovo": the piece leaves the list; its recordings stay.
export async function archiveOwnPiece(id: string): Promise<void> {
  const { error } = await supabase.from('own_pieces').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// For the teacher: the pieces behind some recordings (RLS: their pupils only).
export async function fetchPiecesByIds(ids: string[]): Promise<Map<string, OwnPiece>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('own_pieces').select('*').in('id', ids)
  if (error) throw error
  return new Map(((data ?? []) as OwnPiece[]).map((p) => [p.id, p]))
}
