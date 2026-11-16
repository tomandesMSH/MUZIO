// Grading from the keyboard (on a computer): 1-5 the notes, space plays or
// pauses the recording, Ctrl/Cmd+Enter sends and opens the next one.
export type GradingKeyAction = { type: 'rate'; rating: number } | { type: 'play' } | { type: 'submit' }

interface KeyInfo {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  // Typing in a text field: only Ctrl+Enter counts there.
  inTextField: boolean
}

export function gradingKeyAction(e: KeyInfo): GradingKeyAction | null {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return { type: 'submit' }
  if (e.inTextField || e.ctrlKey || e.metaKey || e.altKey) return null
  if (/^[1-5]$/.test(e.key)) return { type: 'rate', rating: Number(e.key) }
  if (e.key === ' ') return { type: 'play' }
  return null
}

export function isTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'textarea' || el.isContentEditable) return true
  if (tag !== 'input') return false
  const type = (el as HTMLInputElement).type
  return !['checkbox', 'radio', 'button', 'submit', 'range'].includes(type)
}
