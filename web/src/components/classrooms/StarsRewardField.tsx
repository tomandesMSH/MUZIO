// "Odměna za splnění" on an assignment (migration 0058): 0-5 stars the pupil
// gets when the teacher grades their recording for it the first time.
export function StarsRewardField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-text-muted">Odměna za splnění (nepovinné)</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
      >
        <option value={0}>Bez odměny</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {starsLabel(n)} po ohodnocení
          </option>
        ))}
      </select>
    </label>
  )
}

// "1 hvězda", "2 hvězdy", "5 hvězd".
export function starsLabel(n: number): string {
  if (n === 1) return '1 hvězda'
  if (n >= 2 && n <= 4) return `${n} hvězdy`
  return `${n} hvězd`
}
