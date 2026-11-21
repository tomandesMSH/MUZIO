import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LessonCard } from './LessonCard'
import { OWN_PIECE_TITLE_MAX, validatePieceLink, type OwnPiece } from '../../lib/data/ownPieces'

interface OwnPiecesProps {
  pieces: OwnPiece[]
  onAdd: (title: string, link: string) => Promise<void>
  onArchive: (piece: OwnPiece) => void
  onOpen: (piece: OwnPiece) => void
}

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return 'odkaz'
  }
}

// "Moje skladby" (issue #4): what the pupil practises on top of the
// assignments - a song from YouTube, a piece from home. The teacher sees the
// recordings and grades them like any other.
export function OwnPieces({ pieces, onAdd, onArchive, onOpen }: OwnPiecesProps) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const linkProblem = validatePieceLink(link)
    if (linkProblem) return setError(linkProblem)
    setSaving(true)
    setError(undefined)
    try {
      await onAdd(title, link)
      setTitle('')
      setLink('')
      setAdding(false)
    } catch {
      setError('Skladbu se nepodařilo přidat, zkus to znovu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-heading font-semibold text-text-muted">Moje skladby</h2>
        {!adding && (
          <button
            type="button"
            className="text-xs font-heading font-semibold text-coral-dark hover:underline"
            onClick={() => setAdding(true)}
          >
            + Přidat skladbu
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-2.5 rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2.5">
          <Input
            aria-label="Název skladby"
            placeholder="Název, např. Smells Like Teen Spirit, intro"
            value={title}
            maxLength={OWN_PIECE_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <Input
            aria-label="Odkaz (nepovinné)"
            placeholder="Odkaz na YouTube nebo noty (nepovinné)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            inputMode="url"
          />
          {error && <p className="text-xs text-coral-dark">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1 !py-2" onClick={() => setAdding(false)}>
              Zrušit
            </Button>
            <Button type="submit" className="flex-1 !py-2" disabled={saving || !title.trim()}>
              Přidat
            </Button>
          </div>
        </form>
      )}

      {pieces.length === 0 && !adding && (
        <p className="text-xs text-text-muted">
          Hraješ i něco jiného než úkoly? Přidej si to sem a pošli nahrávku. Učitel ji uvidí a ohodnotí, XP i ohýnky se
          počítají stejně.
        </p>
      )}

      <div className="space-y-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
        {pieces.map((piece) => (
          <LessonCard
            key={piece.id}
            icon="note"
            title={piece.title}
            meta={piece.link ? hostOf(piece.link) : 'Vlastní skladba'}
            badge={{ label: 'Nahrát', tone: 'xp' }}
            onClick={() => onOpen(piece)}
            footer={
              <button
                type="button"
                className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
                onClick={() => onArchive(piece)}
              >
                Hotovo, schovat ze seznamu
              </button>
            }
          />
        ))}
      </div>
    </div>
  )
}
