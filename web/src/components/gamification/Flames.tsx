import { FLAMES_PER_CYCLE, FLAMES_PER_PHASE, flamesLabel, type FlameProgress } from '../../lib/flames'
import { Progress } from '../ui/Progress'

export function FlameIcon({ lit, className = 'h-7 w-7' }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.5c.6 3-1.2 4.6-2.7 6.3C7.6 10.7 6 12.6 6 15.4 6 18.9 8.7 21.5 12 21.5s6-2.6 6-6.1c0-2.3-1-3.9-2.2-5.3-.3 1.4-1 2.4-2 2.9.4-3.5-.4-7-1.8-10.5Z"
        className={lit ? 'fill-coral stroke-coral-dark' : 'fill-none stroke-border'}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {lit && (
        <path d="M12 21.5c-1.9 0-3.2-1.4-3.2-3.2 0-1.7 1.3-2.7 2.2-3.9.4 1 1.1 1.6 1.9 1.9.2-.9.5-1.6 1-2.2.8 1 1.3 2.1 1.3 3.4 0 2.3-1.4 4-3.2 4Z" fill="#fdc06b" />
      )}
    </svg>
  )
}

// The row of seven flames for the current phase and the round of 28 under it.
export function Flames({ progress }: { progress: FlameProgress }) {
  const { filled, toNextPhase, atMilestone, inCycle, total, completedCycles } = progress
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm font-heading font-semibold">Plamínky</h2>
        <span className="text-xs text-text-muted">
          {atMilestone ? 'Fáze hotová' : `Ještě ${flamesLabel(toNextPhase)} do další fáze`}
        </span>
      </div>
      <ol className="flex gap-1.5" aria-label={`${filled} z ${FLAMES_PER_PHASE} plamínků v této fázi`}>
        {Array.from({ length: FLAMES_PER_PHASE }, (_, i) => (
          <li key={i}>
            <FlameIcon lit={i < filled} />
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center justify-between text-xs text-text-muted mb-1">
        <span>Celý svět</span>
        <span>
          {inCycle}/{FLAMES_PER_CYCLE}
        </span>
      </div>
      <Progress value={inCycle / FLAMES_PER_CYCLE} />
      <p className="mt-2 text-xs text-text-muted">
        Plamínek dostaneš za každý den, kdy pošleš nahrávku. Dny nemusí jít po sobě.
        {total > 0 && ` Celkem ${flamesLabel(total)}`}
        {completedCycles > 0 && `, hotové světy: ${completedCycles}`}
        {total > 0 && '.'}
      </p>
    </div>
  )
}
