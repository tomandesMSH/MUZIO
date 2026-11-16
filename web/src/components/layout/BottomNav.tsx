import { useLocation, useNavigate } from 'react-router-dom'
import { navItemsFor } from './navItems'
import { NavIcon } from './NavIcon'
import { NavBadge } from './NavBadge'
import { useNavBadges, type NavBadgeKey } from '../../lib/navBadges'

// Phone navigation: pinned to the bottom of the screen (above the home
// gesture bar), always visible. The current page gets a coral pill.
export function BottomNav({ role }: { role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const items = navItemsFor(role)
  const activeTab = new URLSearchParams(location.search).get('tab')
  const badges = useNavBadges(items.flatMap((i) => (i.badge ? [i.badge.key] : [])) as NavBadgeKey[])

  return (
    <nav
      aria-label="Hlavní navigace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {items.map((item) => {
          const active = item.isActive(location.pathname, activeTab)
          return (
            <button
              key={item.to}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 text-[11px] font-heading font-semibold transition-colors ${
                active ? 'text-coral-dark' : 'text-text-muted hover:text-text-primary'
              }`}
              onClick={() => navigate(item.to)}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                  active ? 'bg-coral-tint' : ''
                }`}
              >
                <span className="relative">
                  <NavIcon name={item.icon} className="w-[22px] h-[22px]" />
                  {item.badge && <NavBadge count={badges[item.badge.key]} label={item.badge.label} />}
                </span>
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
