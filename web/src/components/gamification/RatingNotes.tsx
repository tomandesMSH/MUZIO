// The teacher's 1-5 rating of a recording, shown as notes so it isn't
// confused with the stars the teacher awards separately (migration 0024).
interface RatingNotesProps {
  rating: number
  // Given = the teacher picks the rating; without it the notes are read-only.
  onChange?: (rating: number) => void
  // The notes spread over the whole width (grading screen).
  wide?: boolean
}

export function RatingNotes({ rating, onChange, wide = false }: RatingNotesProps) {
  if (!onChange) {
    return (
      <div className="flex gap-1" role="img" aria-label={`Hodnocení ${rating} z 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} aria-hidden className={n <= rating ? '' : 'grayscale opacity-25'}>
            🎵
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className={wide ? 'flex w-full justify-between' : 'flex gap-1.5'} role="radiogroup" aria-label="Hodnocení">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === rating}
          aria-label={`${n} z 5`}
          onClick={() => onChange(n)}
          className={`${wide ? 'flex-1 py-1 text-4xl' : 'text-2xl'} transition ${n <= rating ? '' : 'grayscale opacity-25'}`}
        >
          🎵
        </button>
      ))}
    </div>
  )
}
