import { supabase } from '../supabase'

// The teacher's saved phrases for grading (migration 0036).
export type SnippetKind = 'good' | 'improve'

export interface CommentSnippet {
  id: string
  kind: SnippetKind
  text: string
}

// Offered until the teacher saves phrases of their own for that field.
export const DEFAULT_SNIPPETS: Record<SnippetKind, string[]> = {
  good: ['Krásný přednes', 'Čistě zahrané', 'Pěkně v rytmu', 'Velký pokrok!'],
  improve: ['Pozor na rytmus', 'Hlídej prstoklad', 'Zpomal a hraj rovnoměrně', 'Víc dynamiky (p / f)'],
}

export async function fetchCommentSnippets(teacherId: string): Promise<CommentSnippet[]> {
  const { data, error } = await supabase
    .from('comment_snippets')
    .select('id, kind, text')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as CommentSnippet[]
}

export async function addCommentSnippet(teacherId: string, kind: SnippetKind, text: string): Promise<CommentSnippet> {
  const { data, error } = await supabase
    .from('comment_snippets')
    .insert({ teacher_id: teacherId, kind, text: text.trim().slice(0, 200) })
    .select('id, kind, text')
    .single()
  if (error) throw error
  return data as CommentSnippet
}

export async function deleteCommentSnippet(id: string): Promise<void> {
  const { error } = await supabase.from('comment_snippets').delete().eq('id', id)
  if (error) throw error
}

// Adds a phrase to what's already in the field: on a new sentence.
export function appendPhrase(current: string, phrase: string): string {
  const text = current.trimEnd()
  if (!text) return phrase
  return /[.!?…]$/.test(text) ? `${text} ${phrase}` : `${text}. ${phrase}`
}
