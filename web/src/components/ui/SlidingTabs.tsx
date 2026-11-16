import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface Tab<T extends string> {
  id: T
  label: string
}

interface SlidingTabsProps<T extends string> {
  tabs: Tab<T>[]
  value: T
  onChange: (id: T) => void
  label?: string
}

interface Box {
  left: number
  width: number
}

// A segmented tab bar whose highlight slides: the solid pill follows the
// selected tab, a fainter one follows the pointer while hovering. Scrolls
// sideways on a phone; with "reduce motion" the pills jump instead of slide.
export function SlidingTabs<T extends string>({ tabs, value, onChange, label }: SlidingTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<T, HTMLButtonElement>())
  const [hovered, setHovered] = useState<T>()
  const [boxes, setBoxes] = useState<Partial<Record<T, Box>>>({})

  const measure = useCallback(() => {
    const next: Partial<Record<T, Box>> = {}
    for (const [id, el] of tabRefs.current) next[id] = { left: el.offsetLeft, width: el.offsetWidth }
    setBoxes(next)
  }, [])

  // Positions change with the window width, fonts loading, labels...
  // Measured after paint (a frame later, then on every resize).
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure)
    const list = listRef.current
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    if (list && observer) {
      observer.observe(list)
      for (const el of tabRefs.current.values()) observer.observe(el)
    }
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [measure, tabs.length])

  // Keep the selected tab in view when the bar scrolls (phone).
  useLayoutEffect(() => {
    tabRefs.current.get(value)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [value])

  const active = boxes[value]
  const hover = hovered !== undefined && hovered !== value ? boxes[hovered] : undefined

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length]
    onChange(next.id)
    tabRefs.current.get(next.id)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className="relative flex gap-1.5 overflow-x-auto rounded-xl bg-bg-card-alt shadow-clay-press p-1"
      onMouseLeave={() => setHovered(undefined)}
    >
      {hover && (
        <span
          aria-hidden
          data-testid="tab-hover-pill"
          className="absolute top-1 bottom-1 rounded-lg bg-bg-card shadow-clay-sm opacity-50 transition-all duration-200 ease-out motion-reduce:transition-none"
          style={{ left: hover.left, width: hover.width }}
        />
      )}
      {active && (
        <span
          aria-hidden
          data-testid="tab-active-pill"
          className="absolute top-1 bottom-1 rounded-lg bg-bg-card shadow-clay-sm transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ left: active.left, width: active.width }}
        />
      )}
      {tabs.map((t, index) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) tabRefs.current.set(t.id, el)
              else tabRefs.current.delete(t.id)
            }}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`relative z-10 flex-1 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-heading font-semibold transition-colors duration-200 ${
              selected ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
            onMouseEnter={() => setHovered(t.id)}
            onFocus={() => setHovered(t.id)}
            onBlur={() => setHovered(undefined)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
