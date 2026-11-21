import { worldInfo, type WorldId } from '../../lib/world'
import { maskStyle, worldArtUrl } from './worldArt'

// The pupil's world at its phase: 0 = nothing yet, 1-4 = after 7, 14, 21 and
// 28 flames. A placeholder until the designer's artwork (160 x 110 SVG, five
// per world, each phase adding to the one before) is in; it says which
// picture belongs here.
// flamesInCycle (0..28) moves worlds with more pictures than phases on
// between the phases.
export function WorldScene({
  world,
  phase,
  flamesInCycle,
  className = 'w-full',
}: {
  world: WorldId
  phase: number
  flamesInCycle?: number
  className?: string
}) {
  const p = Math.max(0, Math.min(4, Math.floor(phase)))
  const info = worldInfo(world)
  const art = worldArtUrl(world, p, flamesInCycle)
  if (art) {
    return (
      <div
        role="img"
        aria-label={`${info.name}: ${p === 0 ? 'začátek' : info.phases[p - 1]}`}
        className={`${className} aspect-[4/3] bg-coral`}
        style={maskStyle(art)}
      />
    )
  }
  return (
    <svg viewBox="0 0 160 110" className={className} role="img" aria-label="Obrázek chybí">
      <rect x={2} y={2} width={156} height={106} rx={14} className="fill-bg-card-alt stroke-border" strokeWidth={2} strokeDasharray="6 5" />
      <text x={80} y={50} textAnchor="middle" fontSize={11} className="fill-text-muted">
        Obrázek chybí
      </text>
      <text x={80} y={66} textAnchor="middle" fontSize={8} className="fill-text-muted">
        {info.name} · {p === 0 ? 'začátek' : `fáze ${p}: ${info.phases[p - 1]}`}
      </text>
    </svg>
  )
}
