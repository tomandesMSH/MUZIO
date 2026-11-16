export const NOTE_MAX = 300

// "Vzkaz pro učitele" under a recording that's about to be sent.
export function NoteForTeacher({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-text-muted">Vzkaz pro učitele (nepovinné)</span>
      <textarea
        value={value}
        maxLength={NOTE_MAX}
        rows={2}
        placeholder="Např. „V taktu 8 jsem se spletl“ nebo „Nevím, jak hrát ten skok“"
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-bg-card-alt shadow-clay-press px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-coral"
      />
      {value.length > NOTE_MAX - 40 && (
        <span className="block text-right text-[11px] text-text-muted">
          {value.length}/{NOTE_MAX}
        </span>
      )}
    </label>
  )
}
