import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { WorldCover } from './WorldCover'
import { worldInfo } from '../../lib/world'
import type { WorldId } from '../../lib/world'

// The pupil's world on the dashboard, with the way to change it.
export function WorldCard({ world }: { world: WorldId | null | undefined }) {
  const info = worldInfo(world)
  return (
    <Card className="flex items-center gap-4">
      <WorldCover world={info.id} className="h-16 w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="font-heading font-semibold">{info.name}</h2>
        <p className="text-xs text-text-muted">{info.tagline}</p>
        <Link to="/student/svet" className="mt-1 inline-block text-xs font-semibold text-coral-dark hover:underline">
          {world ? 'Změnit můj svět' : 'Vybrat si svět'}
        </Link>
      </div>
    </Card>
  )
}
