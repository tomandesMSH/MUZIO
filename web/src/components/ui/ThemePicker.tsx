import { setThemeChoice, useTheme, type ThemeChoice } from '../../lib/theme'

const OPTIONS: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Světlý' },
  { id: 'dark', label: 'Tmavý' },
  { id: 'system', label: 'Podle systému' },
]

// Profile > Vzhled.
export function ThemePicker() {
  const { choice } = useTheme()
  return (
    <div className="flex gap-1 rounded-xl bg-bg-card-alt p-1 shadow-clay-press" role="radiogroup" aria-label="Vzhled">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={choice === o.id}
          onClick={() => setThemeChoice(o.id)}
          className={`rounded-lg px-2.5 py-1 text-xs font-heading font-semibold transition ${
            choice === o.id ? 'bg-bg-card text-text-primary shadow-clay-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
