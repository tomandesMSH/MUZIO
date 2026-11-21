import type { BadgeResult } from '../../lib/game-logic'

// One badge in the profile: the icon (with its tier, e.g. 🔥 30), the name, how to earn it and the progress.
export function BadgeTile({ badge }: { badge: BadgeResult }) {
  return (
    <li
      className={`rounded-2xl p-3 flex items-start gap-2.5 ${
        badge.unlocked ? 'bg-bg-card shadow-clay-sm' : 'bg-bg-card-alt'
      }`}
    >
      <span aria-hidden="true" className="relative block shrink-0">
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg leading-none ${
            badge.unlocked ? 'bg-coral-tint shadow-clay-sm' : 'bg-bg-card shadow-clay-press grayscale opacity-60'
          }`}
        >
          {badge.icon}
        </span>
        {badge.tier && (
          <span
            className={`absolute -bottom-1 -right-1.5 min-w-5 h-4 px-1 rounded-full text-[10px] font-heading font-bold leading-4 text-center ${
              badge.unlocked ? 'bg-coral text-white ring-2 ring-bg-card' : 'bg-bg-card-alt text-text-muted ring-1 ring-border'
            }`}
          >
            {badge.tier}
          </span>
        )}
      </span>
      <div className="min-w-0">
        <div className={`text-xs font-heading font-semibold ${badge.unlocked ? '' : 'text-text-muted'}`}>
          {badge.label}
        </div>
        <div className="text-[11px] leading-snug text-text-muted">{badge.description}</div>
        <div className="text-[11px] font-semibold mt-0.5 text-text-muted">
          {badge.unlocked
            ? `Získáno${badge.count && badge.count > 1 ? ` ×${badge.count}` : ''}`
            : badge.progressLabel}
        </div>
      </div>
    </li>
  )
}
