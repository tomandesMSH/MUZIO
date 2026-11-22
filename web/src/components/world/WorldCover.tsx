import type { WorldId } from '../../lib/world'
import { maskStyle, worldCover } from './worldArt'

// The picture of each world on the picker and the dashboard card. A
// placeholder until the designer's artwork (96 x 96 SVG, one per world) is in.
export function WorldCover({ world, className = 'h-20 w-20' }: { world: WorldId; className?: string }) {
  const art = worldCover(world)
  if (art?.kind === 'lines') return <div aria-hidden className={`${className} bg-coral`} style={maskStyle(art.url)} />
  if (art) return <img src={art.url} alt="" aria-hidden loading="lazy" className={`${className} rounded-xl object-cover`} />
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label={`Obrázek chybí (${world})`}>
      <rect x={2} y={2} width={92} height={92} rx={14} className="fill-bg-card-alt stroke-border" strokeWidth={2} strokeDasharray="6 5" />
      <text x={48} y={46} textAnchor="middle" fontSize={11} className="fill-text-muted">
        Obrázek
      </text>
      <text x={48} y={60} textAnchor="middle" fontSize={11} className="fill-text-muted">
        chybí
      </text>
    </svg>
  )
}
