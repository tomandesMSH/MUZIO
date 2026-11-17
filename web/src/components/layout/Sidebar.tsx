import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navItemsFor } from './navItems'
import { NavIcon } from './NavIcon'
import { NavBadge } from './NavBadge'
import { DOCS_URL } from '../../lib/links'
import { useNavBadges, type NavBadgeKey } from '../../lib/navBadges'

interface Box {
  top: number
  height: number
}

// Every page mounts its own AppShell, so the sidebar is new on each page. It
// remembers where the pill was, draws it there first and then slides it to
// the new page.
let lastActiveIndex: number | undefined

// Desktop navigation. Like the admin tabs (SlidingTabs), the highlight
// slides: the coral pill to the current page, a faint one under the pointer.
// With "reduce motion" the pills jump instead.
export function Sidebar({ role }: { role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const items = navItemsFor(role)
  const activeTab = new URLSearchParams(location.search).get('tab')
  const badges = useNavBadges(items.flatMap((i) => (i.badge ? [i.badge.key] : [])) as NavBadgeKey[])
  const activeIndex = items.findIndex((item) => item.isActive(location.pathname, activeTab))

  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [hovered, setHovered] = useState<number>()
  const [boxes, setBoxes] = useState<Box[]>([])
  const [shownIndex, setShownIndex] = useState(() => lastActiveIndex ?? activeIndex)

  const measure = useCallback(() => {
    setBoxes(itemRefs.current.map((el) => (el ? { top: el.offsetTop, height: el.offsetHeight } : { top: 0, height: 0 })))
  }, [])

  // Measured after paint, then on every resize.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure)
    const list = listRef.current
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    if (list && observer) observer.observe(list)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [measure, items.length])

  // Once the pill has been painted where it was, move it (the CSS transition
  // does the sliding).
  const measured = boxes.length > 0
  useEffect(() => {
    lastActiveIndex = activeIndex
    if (!measured) return
    const frame = requestAnimationFrame(() => setShownIndex(activeIndex))
    return () => cancelAnimationFrame(frame)
  }, [activeIndex, measured])

  const active = shownIndex >= 0 ? boxes[shownIndex] : undefined
  const hover = hovered !== undefined && hovered !== activeIndex ? boxes[hovered] : undefined

  return (
    <div className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border md:p-5 md:sticky md:top-0 md:h-dvh">
      <div className="flex items-center gap-2.5 mb-6 px-1">
        <img src="/favicon.svg" alt="" className="w-8 h-8 shrink-0" />
        <span className="font-heading font-bold text-base">Muzio</span>
      </div>
      <nav ref={listRef} className="relative flex flex-col gap-1" onMouseLeave={() => setHovered(undefined)}>
        {hover && (
          <span
            aria-hidden
            data-testid="nav-hover-pill"
            className="absolute inset-x-0 rounded-lg bg-bg-card-alt transition-all duration-200 ease-out motion-reduce:transition-none"
            style={{ top: hover.top, height: hover.height }}
          />
        )}
        {active && (
          <span
            aria-hidden
            data-testid="nav-active-pill"
            className="absolute inset-x-0 rounded-lg bg-coral-tint shadow-clay-sm transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ top: active.top, height: active.height }}
          />
        )}
        {items.map((item, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={item.to}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`relative z-10 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-heading font-semibold text-left transition-colors duration-200 ${
                isActive ? 'text-coral-dark' : 'text-text-muted hover:text-text-primary'
              }`}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(undefined)}
              onClick={() => navigate(item.to)}
            >
              <span className="relative shrink-0">
                <NavIcon name={item.icon} className="w-5 h-5" />
                {item.badge && <NavBadge count={badges[item.badge.key]} label={item.badge.label} />}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-heading font-semibold text-text-muted transition-colors duration-200 hover:bg-bg-card-alt hover:text-text-primary"
      >
        <span className="relative shrink-0">
          <NavIcon name="docs" className="w-5 h-5" />
        </span>
        Dokumentace
      </a>
    </div>
  )
}
