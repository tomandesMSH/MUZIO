import { useId } from 'react'
import { toDateKey } from '../../lib/game-logic'

// "Termín (nepovinné)" when assigning a task: a day, or none.
export function DueDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-text-muted">
        Termín odevzdání (nepovinné)
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="date"
          value={value}
          min={toDateKey(new Date())}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
        />
        {value && (
          <button type="button" className="text-xs text-text-muted underline underline-offset-2" onClick={() => onChange('')}>
            Bez termínu
          </button>
        )}
      </div>
    </div>
  )
}
