import { useState } from 'react'
import { DEFAULT_SNIPPETS, type CommentSnippet, type SnippetKind } from '../../lib/data/commentSnippets'

interface QuickPhrasesProps {
  kind: SnippetKind
  saved: CommentSnippet[]
  // What's in the field now - offered for saving when it's not saved yet.
  current: string
  onInsert: (phrase: string) => void
  onSave: (text: string) => void
  onDelete: (snippet: CommentSnippet) => void
}

// Chips under a grading field: one tap puts a common phrase in. The teacher
// keeps their own; until then a few defaults are offered.
export function QuickPhrases({ kind, saved, current, onInsert, onSave, onDelete }: QuickPhrasesProps) {
  const [editing, setEditing] = useState(false)
  const own = saved.filter((s) => s.kind === kind)
  const phrases = own.length > 0 ? own : DEFAULT_SNIPPETS[kind].map((text) => ({ id: '', kind, text }))
  const candidate = current.trim()
  const canSave = candidate.length > 0 && candidate.length <= 200 && !own.some((s) => s.text === candidate)

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {phrases.map((p) =>
        editing && p.id ? (
          <button
            key={p.id}
            type="button"
            onClick={() => onDelete(p)}
            aria-label={`Smazat větu ${p.text}`}
            className="rounded-full border border-coral/50 px-2.5 py-1 text-xs text-coral-dark"
          >
            {p.text} ✕
          </button>
        ) : (
          <button
            key={p.id || p.text}
            type="button"
            onClick={() => onInsert(p.text)}
            className="rounded-full bg-bg-card-alt px-2.5 py-1 text-xs text-text-primary shadow-clay-sm hover:text-coral-dark"
          >
            {p.text}
          </button>
        ),
      )}
      {canSave && !editing && (
        <button
          type="button"
          onClick={() => onSave(candidate)}
          className="rounded-full px-2 py-1 text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
        >
          + Uložit jako rychlou větu
        </button>
      )}
      {own.length > 0 && (
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="rounded-full px-2 py-1 text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
        >
          {editing ? 'Hotovo' : 'Upravit'}
        </button>
      )}
    </div>
  )
}
