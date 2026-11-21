import type { WorldId } from '../../lib/world'

// The picture of each world on the picker and the dashboard card. Fixed
// colours: they read on both the light and the dark card.
export function WorldCover({ world, className = 'h-20 w-20' }: { world: WorldId; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      {world === 'zahradka' && <Garden />}
      {world === 'hrad' && <Castle />}
      {world === 'vesmir' && <Space />}
      {world === 'podium' && <Stage />}
    </svg>
  )
}

function Garden() {
  return (
    <g>
      <path d="M48 70V40" stroke="#3f8f4a" strokeWidth={4} strokeLinecap="round" />
      <path d="M48 58c-8-1-13-6-14-13 8 0 13 5 14 13Z" fill="#5fb36a" />
      <path d="M48 52c7-1 12-6 13-12-7 0-12 5-13 12Z" fill="#5fb36a" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={48} cy={24} rx={6} ry={9} fill="#f7a1b5" transform={`rotate(${a} 48 33)`} />
      ))}
      <circle cx={48} cy={33} r={6} fill="#f6c445" />
      <path d="M32 70h32l-4 18H36Z" fill="#c9714a" />
      <rect x={29} y={66} width={38} height={7} rx={2} fill="#b0603d" />
      <path d="M70 18v12" stroke="#7a6fd0" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M70 18l6 2v4l-6-2" fill="#7a6fd0" />
      <circle cx={67.5} cy={30} r={3} fill="#7a6fd0" />
    </g>
  )
}

function Castle() {
  return (
    <g>
      <rect x={20} y={40} width={56} height={46} fill="#d9c7a7" stroke="#9c8463" strokeWidth={1.5} />
      {[20, 36, 52, 68].map((x) => (
        <rect key={x} x={x} y={34} width={8} height={8} fill="#d9c7a7" stroke="#9c8463" strokeWidth={1.5} />
      ))}
      <rect x={14} y={26} width={16} height={60} fill="#cbb48f" stroke="#9c8463" strokeWidth={1.5} />
      <rect x={66} y={26} width={16} height={60} fill="#cbb48f" stroke="#9c8463" strokeWidth={1.5} />
      <path d="M12 28l10-16 10 16Z" fill="#d9534f" />
      <path d="M64 28l10-16 10 16Z" fill="#d9534f" />
      <path d="M22 12V4" stroke="#6b5b4b" strokeWidth={2} />
      <path d="M22 4l8 3-8 3Z" fill="#f6c445" />
      <path d="M74 12V4" stroke="#6b5b4b" strokeWidth={2} />
      <path d="M74 4l8 3-8 3Z" fill="#f6c445" />
      <path d="M40 86V68a8 8 0 0 1 16 0v18Z" fill="#8a5a3b" />
      <rect x={18} y={44} width={8} height={10} rx={4} fill="#6b7fd7" />
      <rect x={70} y={44} width={8} height={10} rx={4} fill="#6b7fd7" />
    </g>
  )
}

function Space() {
  return (
    <g>
      <circle cx={14} cy={18} r={1.6} fill="#f6c445" />
      <circle cx={82} cy={12} r={1.6} fill="#f6c445" />
      <circle cx={86} cy={60} r={1.4} fill="#f6c445" />
      <circle cx={10} cy={70} r={1.4} fill="#f6c445" />
      <circle cx={44} cy={58} r={22} fill="#5fb3a8" />
      <path d="M30 50c6 3 12 2 18-2M34 66c8 2 14 0 20-4" stroke="#4a9a8f" strokeWidth={3} strokeLinecap="round" fill="none" />
      <ellipse cx={44} cy={58} rx={36} ry={9} fill="none" stroke="#f6c445" strokeWidth={3} transform="rotate(-14 44 58)" />
      <g transform="rotate(35 72 24)">
        <path d="M72 8c6 6 7 16 5 24h-10c-2-8-1-18 5-24Z" fill="#eef0f4" />
        <circle cx={72} cy={20} r={3} fill="#6b7fd7" />
        <path d="M67 26l-5 8h6M77 26l5 8h-6" fill="#d9534f" />
        <path d="M69 33l3 8 3-8Z" fill="#f6a445" />
      </g>
    </g>
  )
}

function Stage() {
  return (
    <g>
      <path d="M8 8h80v8H8Z" fill="#8f2d3a" />
      <path d="M8 16h16c-2 20-2 44 0 62H8Z" fill="#b23a48" />
      <path d="M88 16H72c2 20 2 44 0 62h16Z" fill="#b23a48" />
      <path d="M30 16l-8 50h52l-8-50Z" fill="#f6e3a1" opacity={0.45} />
      <rect x={6} y={74} width={84} height={14} rx={2} fill="#7a5235" />
      <rect x={6} y={74} width={84} height={4} fill="#94663f" />
      <path d="M48 74V50" stroke="#4b4f57" strokeWidth={2.5} />
      <path d="M40 74h16" stroke="#4b4f57" strokeWidth={2.5} strokeLinecap="round" />
      <rect x={43} y={36} width={10} height={16} rx={5} fill="#5a5f69" />
      <path d="M44 42h8M44 46h8" stroke="#7c828c" strokeWidth={1.2} />
      <path d="M62 30v-8l6-2v8" stroke="#f6c445" strokeWidth={2} fill="none" />
      <circle cx={60.5} cy={30} r={2.4} fill="#f6c445" />
      <circle cx={66.5} cy={28} r={2.4} fill="#f6c445" />
    </g>
  )
}
