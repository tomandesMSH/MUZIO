import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navItemsFor } from './navItems'
import { NavIcon } from './NavIcon'
import { NavBadge } from './NavBadge'
import { useNavBadges, type NavBadgeKey } from '../../lib/navBadges'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

// Every page mounts its own AppShell, so the bar is new on each page. Like the
// sidebar, it remembers where the pill was, draws it there first and then
// slides it to the new page.
let lastActiveIndex: number | undefined

// Phone navigation: pinned to the bottom of the screen (above the home
// gesture bar), always visible. A coral pill slides to the current page
// (it jumps with "reduce motion").
export function BottomNav({ role }: { role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const items = navItemsFor(role).filter((item) => !item.desktopOnly)
  const activeTab = new URLSearchParams(location.search).get('tab')
  const badges = useNavBadges(items.flatMap((i) => (i.badge ? [i.badge.key] : [])) as NavBadgeKey[])
  const activeIndex = items.findIndex((item) => item.isActive(location.pathname, activeTab))

  const rowRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [shownIndex, setShownIndex] = useState(() => lastActiveIndex ?? activeIndex)

  const measure = useCallback(() => {
    const row = rowRef.current?.getBoundingClientRect()
    if (!row) return
    // Relative to the row (each button is its own positioning box).
    setBoxes(
      pillRefs.current.map((el) => {
        if (!el) return { left: 0, top: 0, width: 0, height: 0 }
        const box = el.getBoundingClientRect()
        return { left: box.left - row.left, top: box.top - row.top, width: box.width, height: box.height }
      }),
    )
  }, [])

  // Measured after paint, then on every resize (turning the phone).
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure)
    const row = rowRef.current
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    if (row && observer) observer.observe(row)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [measure, items.length])

  // Once the pill has been painted where it was, move it (CSS does the sliding).
  const measured = boxes.length > 0
  useEffect(() => {
    lastActiveIndex = activeIndex
    if (!measured) return
    const frame = requestAnimationFrame(() => setShownIndex(activeIndex))
    return () => cancelAnimationFrame(frame)
  }, [activeIndex, measured])

  const pill = shownIndex >= 0 ? boxes[shownIndex] : undefined

  return (
    <nav
      aria-label="Hlavní navigace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div ref={rowRef} className="relative mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {pill && pill.width > 0 && (
          <span
            aria-hidden
            data-testid="bottom-nav-pill"
            className="absolute rounded-full bg-coral-tint transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
          />
        )}
        {items.map((item, index) => {
          const active = index === activeIndex
          return (
            <button
              key={item.to}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 text-[11px] font-heading font-semibold transition-colors duration-200 ${
                active ? 'text-coral-dark' : 'text-text-muted hover:text-text-primary'
              }`}
              onClick={() => navigate(item.to)}
            >
              <span
                ref={(el) => {
                  pillRefs.current[index] = el
                }}
                className="relative z-10 flex h-8 w-14 items-center justify-center rounded-full"
              >
                <span className="relative">
                  <NavIcon name={item.icon} className="w-[22px] h-[22px]" />
                  {item.badge && <NavBadge count={badges[item.badge.key]} label={item.badge.label} />}
                </span>
              </span>
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
