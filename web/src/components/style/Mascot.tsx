import { useId } from 'react'
import type { StyleId } from '../../lib/style'

// The mascot of the pupil's look: a teddy bear for Pohádkový svět, a young
// musician in headphones for Moderní studio. Drawn on its own round backdrop
// so it reads in both themes.
export function Mascot({ style, className = 'h-16 w-16' }: { style: StyleId; className?: string }) {
  const clip = useId()
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <clipPath id={clip}>
        <circle cx={40} cy={40} r={40} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>{style === 'pohadka' ? <Bear /> : <Musician />}</g>
    </svg>
  )
}

function Bear() {
  return (
    <g>
      <circle cx={40} cy={40} r={40} fill="#fbe7c6" />
      {/* body */}
      <ellipse cx={40} cy={70} rx={20} ry={14} fill="#b5763f" />
      <ellipse cx={40} cy={72} rx={11} ry={8} fill="#e2b585" />
      {/* ears */}
      <circle cx={22} cy={22} r={8} fill="#b5763f" />
      <circle cx={58} cy={22} r={8} fill="#b5763f" />
      <circle cx={22} cy={22} r={4} fill="#e2a07a" />
      <circle cx={58} cy={22} r={4} fill="#e2a07a" />
      {/* head */}
      <circle cx={40} cy={38} r={20} fill="#c48549" />
      <ellipse cx={40} cy={45} rx={10} ry={7.5} fill="#ecc89c" />
      <ellipse cx={40} cy={41.5} rx={3.6} ry={2.6} fill="#4a2e1c" />
      <path d="M40 44v3M36.5 48c1.8 1.6 5.2 1.6 7 0" stroke="#4a2e1c" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <circle cx={32.5} cy={34} r={2.6} fill="#2b1c12" />
      <circle cx={47.5} cy={34} r={2.6} fill="#2b1c12" />
      <circle cx={33.3} cy={33.2} r={0.9} fill="#fff" />
      <circle cx={48.3} cy={33.2} r={0.9} fill="#fff" />
      <circle cx={28} cy={42} r={3} fill="#f19a8a" opacity={0.55} />
      <circle cx={52} cy={42} r={3} fill="#f19a8a" opacity={0.55} />
    </g>
  )
}

function Musician() {
  return (
    <g>
      <circle cx={40} cy={40} r={40} fill="#d9e3fb" />
      {/* hoodie */}
      <path d="M14 80c0-16 11-24 26-24s26 8 26 24Z" fill="#4c5bd4" />
      <path d="M34 57l6 7 6-7" stroke="#d9e3fb" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* neck and head */}
      <rect x={35} y={48} width={10} height={9} rx={3} fill="#d9a27a" />
      <circle cx={40} cy={36} r={15} fill="#e8b48c" />
      {/* hair */}
      <path d="M25 34c0-11 7-17 15-17 9 0 16 5 16 15-4-4-9-6-15-5-6 1-11 3-16 7Z" fill="#3b2a20" />
      {/* eyes and smile */}
      <circle cx={34.5} cy={38} r={1.8} fill="#2b1c12" />
      <circle cx={45.5} cy={38} r={1.8} fill="#2b1c12" />
      <path d="M35.5 44c2.6 2.2 6.4 2.2 9 0" stroke="#7a3f2a" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      {/* headphones */}
      <path d="M23 37a17 17 0 0 1 34 0" stroke="#2c2f36" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <rect x={19} y={33} width={8} height={13} rx={3.5} fill="#2c2f36" />
      <rect x={53} y={33} width={8} height={13} rx={3.5} fill="#2c2f36" />
      <rect x={21} y={35.5} width={4} height={8} rx={2} fill="#f95c4b" />
      <rect x={55} y={35.5} width={4} height={8} rx={2} fill="#f95c4b" />
      {/* keys */}
      <rect x={46} y={62} width={24} height={9} rx={2} fill="#f2f3f4" stroke="#2c2f36" strokeWidth={1.2} />
      {[51, 56, 61, 66].map((x) => (
        <rect key={x} x={x - 1} y={62} width={2} height={5} fill="#2c2f36" />
      ))}
    </g>
  )
}
