import { FlameIcon } from '../gamification/Flames'
import { WorldScene } from '../world/WorldScene'
import { FLAMES_PER_PHASE, PHASES_PER_CYCLE, countPracticeDays, flameProgress, flamesLabel } from '../../lib/flames'
import { worldInfo, type WorldId } from '../../lib/world'

// The pupil's flames and world, as the teacher sees them on the pupil card.
export function PupilFlames({
  world,
  dayKeys,
  importedFlames = 0,
}: {
  world: WorldId | null | undefined
  dayKeys: string[]
  // Brought over from Base44 (migration 0055).
  importedFlames?: number
}) {
  const info = worldInfo(world)
  const p = flameProgress(countPracticeDays(dayKeys) + importedFlames)
  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 flex flex-col sm:flex-row gap-4">
      <WorldScene world={info.id} phase={p.phasesDone} className="w-full sm:w-56 shrink-0 rounded-xl" />
      <div className="min-w-0 space-y-2">
        <div>
          <div className="font-heading font-semibold">{info.name}</div>
          <div className="text-xs text-text-muted">
            Fáze {p.phasesDone} ze {PHASES_PER_CYCLE}
            {p.phasesDone > 0 && `: ${info.phases[p.phasesDone - 1]}`}
            {!world && ' (svět si ještě nevybral(a))'}
          </div>
        </div>
        <ol className="flex gap-1" aria-label={`${p.filled} z ${FLAMES_PER_PHASE} plamínků v této fázi`}>
          {Array.from({ length: FLAMES_PER_PHASE }, (_, i) => (
            <li key={i}>
              <FlameIcon lit={i < p.filled} className="h-5 w-5" />
            </li>
          ))}
        </ol>
        <p className="text-xs text-text-muted">
          Celkem {flamesLabel(p.total)} (dní s nahrávkou)
          {importedFlames > 0 && `, z toho ${importedFlames} z Base44`}
          {p.completedCycles > 0 && `, hotové světy: ${p.completedCycles}`}.
        </p>
      </div>
    </div>
  )
}
