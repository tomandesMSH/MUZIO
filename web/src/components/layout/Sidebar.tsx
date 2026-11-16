import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navItemsFor } from './navItems'

interface Box {
  top: number
  height: number
}

// Desktop navigation. Like the admin tabs (SlidingTabs), the highlight
// slides: the coral pill to the current page, a faint one under the pointer.
// With "reduce motion" the pills jump instead.
export function Sidebar({ role }: { role: 'student' | 'teacher' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const items = navItemsFor(role)
  const activeTab = new URLSearchParams(location.search).get('tab')
  const activeIndex = items.findIndex((item) => item.isActive(location.pathname, activeTab))

  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [hovered, setHovered] = useState<number>()
  const [boxes, setBoxes] = useState<Box[]>([])

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

  const active = activeIndex >= 0 ? boxes[activeIndex] : undefined
  const hover = hovered !== undefined && hovered !== activeIndex ? boxes[hovered] : undefined

  return (
    <div className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border md:p-5">
      <div className="flex items-center gap-2.5 mb-6 px-1">
        <div className="w-8 h-8 rounded-lg bg-coral shadow-clay-sm flex items-center justify-center text-sm">🎵</div>
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
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
