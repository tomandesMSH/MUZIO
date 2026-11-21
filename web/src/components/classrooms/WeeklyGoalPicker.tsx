import { useState } from 'react'
import { updateWeeklyGoal } from '../../lib/data/classrooms'
import { getErrorMessage } from '../../lib/errors'
import { daysLabel } from '../../lib/weeklyGoal'

const OPTIONS = [null, 1, 2, 3, 4, 5, 6, 7] as const

// The teacher's "Týdenní cíl" for a class (migration 0053): how many days a
// week the pupils should practise, or none.
export function WeeklyGoalPicker({ classroomId, value }: { classroomId: string; value: number | null | undefined }) {
  const [goal, setGoal] = useState<number | null>(value ?? null)
  const [error, setError] = useState<string>()

  async function change(next: number | null) {
    const before = goal
    setGoal(next)
    setError(undefined)
    try {
      await updateWeeklyGoal(classroomId, next)
    } catch (err) {
      setGoal(before)
      setError(getErrorMessage(err, 'Cíl se nepovedlo uložit. Je spuštěná migrace 0053?'))
    }
  }

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2">
      <label className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-heading font-semibold">Týdenní cíl</span>
        <select
          className="rounded-xl bg-bg-card-alt shadow-clay-press px-3 py-2 text-sm"
          value={goal ?? ''}
          onChange={(e) => change(e.target.value ? Number(e.target.value) : null)}
        >
          {OPTIONS.map((o) => (
            <option key={o ?? 'none'} value={o ?? ''}>
              {o === null ? 'Bez cíle' : `${daysLabel(o)} cvičení v týdnu`}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] text-text-muted">Žáci uvidí na nástěnce, kolik dní tento týden už cvičili.</p>
      {error && <p className="text-xs text-coral-dark">{error}</p>}
    </div>
  )
}
