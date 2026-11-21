import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { WorldScene } from './WorldScene'
import { flamesLabel, PHASES_PER_CYCLE, type FlameProgress } from '../../lib/flames'
import { worldInfo, type WorldId } from '../../lib/world'

// The pupil's world as far as the flames have built it: one phase per 7
// practice days, the whole world after 28.
export function WorldProgress({ world, progress }: { world: WorldId | null | undefined; progress: FlameProgress }) {
  const info = worldInfo(world)
  const { phasesDone, toNextPhase, completedCycles } = progress
  const finished = phasesDone === PHASES_PER_CYCLE
  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading font-semibold">{info.name}</h2>
        <span className="text-xs text-text-muted whitespace-nowrap">
          Fáze {phasesDone} ze {PHASES_PER_CYCLE}
        </span>
      </div>
      <p className="text-sm mt-0.5">{phasesDone > 0 ? info.phases[phasesDone - 1] : 'Tvůj svět čeká na první plamínky'}</p>
      <WorldScene world={info.id} phase={phasesDone} flamesInCycle={progress.inCycle} className="mt-3 w-full max-w-md mx-auto block rounded-xl" />
      <p className="mt-2 text-xs text-text-muted">
        {finished
          ? 'Celý svět je hotový. Dalším dnem cvičení začneš nový.'
          : `Do další fáze ti chybí ${flamesLabel(toNextPhase)}. Plamínek je za každý den s nahrávkou.`}
        {completedCycles > 0 && ` Hotové světy: ${completedCycles}.`}
      </p>
      <Link to="/student/svet" className="mt-1 inline-block text-xs font-semibold text-coral-dark hover:underline">
        {world ? 'Změnit můj svět' : 'Vybrat si svět'}
      </Link>
    </Card>
  )
}
