import type { WorldId } from '../../lib/world'

// The pupil's world at its phase: 0 = nothing yet, 1-4 = after 7, 14, 21 and
// 28 flames. Each phase keeps what the earlier ones built and adds to it.
// Fixed colours on their own backdrop, so it reads in both themes.
export function WorldScene({ world, phase, className = 'w-full' }: { world: WorldId; phase: number; className?: string }) {
  const p = Math.max(0, Math.min(4, Math.floor(phase)))
  return (
    <svg viewBox="0 0 160 110" className={className} role="img" aria-hidden>
      {world === 'zahradka' && <Garden p={p} />}
      {world === 'hrad' && <Castle p={p} />}
      {world === 'vesmir' && <Space p={p} />}
      {world === 'podium' && <Stage p={p} />}
    </svg>
  )
}

function Sparkles({ points, color = '#f6c445' }: { points: [number, number][]; color?: string }) {
  return (
    <g fill={color}>
      {points.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2Z`} />
      ))}
    </g>
  )
}

function Note({ x, y, color = '#7a6fd0' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <path d={`M${x} ${y}v-11l7 2.5v3.5l-7-2.5`} stroke={color} strokeWidth={1.8} fill={color} strokeLinejoin="round" />
      <ellipse cx={x - 2.5} cy={y} rx={3} ry={2.3} fill={color} />
    </g>
  )
}

// Kořínky -> dva lístky -> poupě -> rozkvetlá rostlina.
function Garden({ p }: { p: number }) {
  const stemTop = p >= 4 ? 34 : p === 3 ? 42 : 58
  return (
    <g>
      <rect width={160} height={110} rx={14} fill="#dff0f7" />
      <circle cx={134} cy={22} r={10} fill="#f9d96b" />
      <path d="M0 74h160v22a14 14 0 0 1-14 14H14A14 14 0 0 1 0 96Z" fill="#8a5a3b" />
      <path d="M0 74c30-6 50 4 80 0s50-6 80 0v6H0Z" fill="#6fb36a" />
      {/* seed */}
      <ellipse cx={80} cy={84} rx={5} ry={3.5} fill="#e0b070" />
      {p >= 1 && (
        <g stroke="#f0d9b5" strokeWidth={1.8} strokeLinecap="round" fill="none">
          <path d="M80 87c-2 5-6 8-11 10M80 87c1 6 0 10-2 15M80 87c3 4 8 7 13 8M74 92c-3 0-5 2-7 4M86 93c3 1 5 3 6 6" />
        </g>
      )}
      {p >= 2 && (
        <g>
          <path d={`M80 80V${stemTop}`} stroke="#3f8f4a" strokeWidth={3.5} strokeLinecap="round" />
          <path d="M80 68c-9 0-15-5-17-12 9-1 15 4 17 12Z" fill="#5fb36a" />
          <path d="M80 64c9-1 14-6 16-13-9 0-14 5-16 13Z" fill="#5fb36a" />
        </g>
      )}
      {p === 3 && (
        <g>
          <path d="M80 44c-6-3-7-12 0-18 7 6 6 15 0 18Z" fill="#f7a1b5" />
          <path d="M74 42c2 3 4 4 6 4s4-1 6-4c-2 6-10 6-12 0Z" fill="#5fb36a" />
        </g>
      )}
      {p >= 4 && (
        <g>
          <path d="M80 56c-7-1-11-5-12-10 7 0 11 4 12 10Z" fill="#5fb36a" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx={80} cy={20} rx={6.5} ry={10} fill="#f7a1b5" transform={`rotate(${a} 80 30)`} />
          ))}
          <circle cx={80} cy={30} r={6.5} fill="#f6c445" />
          <Note x={110} y={36} />
          <Note x={48} y={30} color="#d9534f" />
          <Sparkles points={[[58, 50], [104, 54], [96, 14]]} />
        </g>
      )}
    </g>
  )
}

// Základy -> hradby -> věže -> hotový hrad s vlajkami.
function Castle({ p }: { p: number }) {
  const stone = '#d9c7a7'
  const edge = '#9c8463'
  return (
    <g>
      <rect width={160} height={110} rx={14} fill="#dff0f7" />
      <path d="M18 24c4-4 10-4 14 0 3-2 8-1 9 2H14c0-1 2-3 4-2Z" fill="#fff" />
      <path d="M0 88h160v8a14 14 0 0 1-14 14H14A14 14 0 0 1 0 96Z" fill="#6fb36a" />
      {/* first stones on the site */}
      {p === 0 && (
        <g fill={stone} stroke={edge}>
          <rect x={70} y={82} width={10} height={6} rx={1} />
          <rect x={81} y={83} width={8} height={5} rx={1} />
        </g>
      )}
      {p === 1 && (
        <g fill={stone} stroke={edge}>
          {[44, 56, 68, 80, 92, 104].map((x) => (
            <rect key={x} x={x} y={80} width={12} height={8} />
          ))}
          {[50, 62, 74, 86, 98].map((x) => (
            <rect key={x} x={x} y={72} width={12} height={8} />
          ))}
        </g>
      )}
      {p >= 2 && (
        <g>
          <rect x={46} y={46} width={68} height={42} fill={stone} stroke={edge} strokeWidth={1.5} />
          {[46, 60, 74, 88, 102].map((x) => (
            <rect key={x} x={x} y={40} width={8} height={7} fill={stone} stroke={edge} strokeWidth={1.5} />
          ))}
          <path d="M72 88V72a8 8 0 0 1 16 0v16Z" fill="#8a5a3b" />
        </g>
      )}
      {p >= 3 && (
        <g fill="#cbb48f" stroke={edge} strokeWidth={1.5}>
          <rect x={30} y={34} width={18} height={54} />
          <rect x={112} y={34} width={18} height={54} />
          <rect x={35} y={46} width={8} height={11} rx={4} fill="#6b7fd7" />
          <rect x={117} y={46} width={8} height={11} rx={4} fill="#6b7fd7" />
        </g>
      )}
      {p >= 4 && (
        <g>
          <path d="M27 35l12-20 12 20Z" fill="#d9534f" />
          <path d="M109 35l12-20 12 20Z" fill="#d9534f" />
          <path d="M39 15V5M121 15V5" stroke="#6b5b4b" strokeWidth={2} />
          <path d="M39 5l10 3.5-10 3.5Z" fill="#f6c445" />
          <path d="M121 5l10 3.5-10 3.5Z" fill="#7a6fd0" />
          <Note x={80} y={30} />
          <Sparkles points={[[62, 22], [100, 20], [148, 50]]} />
        </g>
      )}
    </g>
  )
}

// Raketa na rampě -> start -> na oběžné dráze -> přistání na planetě.
function Space({ p }: { p: number }) {
  const stars: [number, number][] = [[14, 16], [40, 30], [70, 12], [120, 26], [146, 14], [26, 60], [138, 66], [100, 50]]
  const rocket = (x: number, y: number, angle: number, burning: boolean) => (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      {burning && <path d="M-4 14l4 12 4-12Z" fill="#f6a445" />}
      <path d="M0-18c7 7 8 19 6 30H-6c-2-11-1-23 6-30Z" fill="#eef0f4" />
      <circle cx={0} cy={-4} r={3.4} fill="#6b7fd7" />
      <path d="M-6 6l-6 9h7M6 6l6 9h-7" fill="#d9534f" />
    </g>
  )
  return (
    <g>
      <rect width={160} height={110} rx={14} fill="#1d2340" />
      <g fill="#f3f0d8">
        {stars.slice(0, p >= 3 ? stars.length : 3).map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} />
        ))}
      </g>
      {p <= 2 && <path d="M0 92h160v4a14 14 0 0 1-14 14H14A14 14 0 0 1 0 96Z" fill="#4a5170" />}
      {p === 0 && (
        <g fill="#8d93a8">
          <rect x={64} y={84} width={14} height={8} rx={2} />
          <path d="M84 92l6-14 6 14Z" />
        </g>
      )}
      {p >= 1 && p <= 2 && (
        <g stroke="#8d93a8" strokeWidth={2} fill="none">
          <path d="M96 92V44M96 52h-10M96 70h-10" />
        </g>
      )}
      {p === 1 && rocket(80, 72, 0, false)}
      {p === 2 && (
        <g>
          {rocket(80, 48, 0, true)}
          <g fill="#c9ccd8">
            <circle cx={70} cy={88} r={8} />
            <circle cx={82} cy={86} r={10} />
            <circle cx={94} cy={89} r={7} />
          </g>
        </g>
      )}
      {p === 3 && (
        <g>
          <circle cx={36} cy={88} r={26} fill="#5fb3a8" />
          <path d="M22 80c6 3 12 2 18-2M20 96c8 2 14 0 20-4" stroke="#4a9a8f" strokeWidth={3} strokeLinecap="round" fill="none" />
          <path d="M60 70c20-30 60-40 90-30" stroke="#f3f0d8" strokeWidth={1} strokeDasharray="3 4" fill="none" />
          {rocket(110, 40, 60, true)}
        </g>
      )}
      {p >= 4 && (
        <g>
          <ellipse cx={80} cy={112} rx={100} ry={30} fill="#e0a86a" />
          <circle cx={46} cy={94} r={5} fill="#c98d52" />
          <circle cx={120} cy={98} r={4} fill="#c98d52" />
          <ellipse cx={130} cy={24} rx={16} ry={16} fill="#5fb3a8" />
          <ellipse cx={130} cy={24} rx={26} ry={6} fill="none" stroke="#f6c445" strokeWidth={2} transform="rotate(-14 130 24)" />
          {rocket(74, 68, 0, false)}
          <path d="M100 84V58" stroke="#eef0f4" strokeWidth={2} />
          <path d="M100 58l14 4-14 4Z" fill="#d9534f" />
          <Note x={40} y={50} color="#f6c445" />
          <Sparkles points={[[56, 30], [96, 36]]} />
        </g>
      )}
    </g>
  )
}

// Opona se otevírá (s mikrofonem) -> světla -> klavír -> koncert.
function Stage({ p }: { p: number }) {
  const curtainOpen = p >= 1
  return (
    <g>
      <rect width={160} height={110} rx={14} fill="#2a1e2a" />
      {p >= 2 && (
        <g fill="#f6e3a1" opacity={0.35}>
          <path d="M40 0l-14 84h40Z" />
          <path d="M120 0l-26 84h40Z" />
        </g>
      )}
      <rect x={8} y={84} width={144} height={16} rx={2} fill="#7a5235" />
      <rect x={8} y={84} width={144} height={4} fill="#94663f" />
      {p >= 1 && (
        <g>
          <path d="M80 84V58M72 84h16" stroke="#9aa0a6" strokeWidth={2.5} strokeLinecap="round" />
          <rect x={75} y={44} width={10} height={16} rx={5} fill="#5a5f69" />
          <g fill="#4b4f57">
            <rect x={34} y={4} width={12} height={8} rx={2} />
            <rect x={114} y={4} width={12} height={8} rx={2} />
          </g>
        </g>
      )}
      {p >= 3 && (
        <g>
          <rect x={98} y={66} width={34} height={18} rx={2} fill="#1b1b1f" />
          <rect x={100} y={68} width={30} height={6} fill="#f2f3f4" />
          {[104, 109, 117, 122].map((x) => (
            <rect key={x} x={x} y={68} width={2.5} height={4} fill="#1b1b1f" />
          ))}
        </g>
      )}
      {p >= 4 && (
        <g>
          <circle cx={62} cy={56} r={6} fill="#f0c8a0" />
          <path d="M54 84V70c0-5 4-8 8-8s8 3 8 8v14Z" fill="#7a6fd0" />
          <g fill="#4b3a4b">
            {[20, 36, 52, 68, 84, 100, 116, 132].map((x) => (
              <circle key={x} cx={x + 4} cy={106} r={6} />
            ))}
          </g>
          <Note x={44} y={40} color="#f6c445" />
          <Note x={92} y={32} color="#f7a1b5" />
          <Sparkles points={[[30, 26], [130, 30], [80, 20]]} />
        </g>
      )}
      {/* curtains: closed until the first phase */}
      <rect x={0} y={0} width={160} height={10} rx={4} fill="#8f2d3a" />
      <path d={curtainOpen ? 'M0 10h22c-3 24-3 50 0 74H0Z' : 'M0 10h80v74H0Z'} fill="#b23a48" />
      <path d={curtainOpen ? 'M160 10h-22c3 24 3 50 0 74h22Z' : 'M160 10H80v74h80Z'} fill="#b23a48" />
      {!curtainOpen && <path d="M80 10v74" stroke="#8f2d3a" strokeWidth={1.5} />}
    </g>
  )
}
