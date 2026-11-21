import type { StyleId } from '../../lib/style'

// The mascot of the pupil's look: a teddy bear for Pohádkový svět, a young
// musician in headphones for Moderní studio. A placeholder until the
// designer's artwork (80 x 80 round SVG avatar, one per style) is in.
export function Mascot({ style, className = 'h-16 w-16' }: { style: StyleId; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} role="img" aria-label={`Obrázek chybí (${style})`}>
      <circle cx={40} cy={40} r={38} className="fill-bg-card-alt stroke-border" strokeWidth={2} strokeDasharray="6 5" />
      <text x={40} y={38} textAnchor="middle" fontSize={11} className="fill-text-muted">
        Obrázek
      </text>
      <text x={40} y={52} textAnchor="middle" fontSize={11} className="fill-text-muted">
        chybí
      </text>
    </svg>
  )
}
