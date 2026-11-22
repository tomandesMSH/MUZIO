import { FlameIcon } from '../gamification/Flames'
import { flameProgress, flamesLabel, PHASES_PER_CYCLE } from '../../lib/flames'
import { worldInfo, type WorldId } from '../../lib/world'

// A pupil's flames and world phase in one short line, the way the pupil sees
// them - for the teacher's and admin's lists (instead of the old streak).
export function PupilFlamesLine({ flames, world }: { flames: number | undefined; world?: WorldId | null }) {
  if (flames === undefined) return <span className="inline-flex items-center gap-1">…</span>
  const { phasesDone } = flameProgress(flames)
  return (
    <span className="inline-flex items-center gap-1">
      <FlameIcon lit={flames > 0} className="h-3.5 w-3.5 shrink-0" />
      {flamesLabel(flames)}
      {world ? ` · ${worldInfo(world).name}, fáze ${phasesDone} ze ${PHASES_PER_CYCLE}` : ''}
    </span>
  )
}
