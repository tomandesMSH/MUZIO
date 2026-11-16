import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Chevron } from './Collapse'

export interface PickerOption {
  value: string
  label: string
  hint?: string
  // Shown in red, e.g. "Odebrat ze třídy".
  danger?: boolean
}

interface PickerMenuProps {
  label: string
  options: PickerOption[]
  onPick: (value: string) => void
  disabled?: boolean
  // Accessible name when the visible label isn't enough ("Přesunout: Pavel").
  ariaLabel?: string
  emptyText?: string
  searchPlaceholder?: string
}

const SEARCH_FROM = 7 // longer lists get a search field

// A button that opens a list of choices in the app's own style - instead of a
// native <select> used as an action button (which looks foreign in dark mode,
// fires the moment you pick and then snaps back to its placeholder).
// The list is portalled to <body>, so a card with overflow-hidden (Collapse)
// can't clip it; it closes on Escape, outside click, scroll and resize.
export function PickerMenu({
  label,
  options,
  onPick,
  disabled,
  ariaLabel,
  emptyText = 'Nic na výběr.',
  searchPlaceholder = 'Hledat…',
}: PickerMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>()

  const q = query.trim().toLowerCase()
  const visible = q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options
  const searchable = options.length >= SEARCH_FROM

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16)
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    })
    setQuery('')
    setActive(0)
    setOpen(true)
  }

  function close(focusButton = true) {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  function pick(option: PickerOption) {
    close()
    onPick(option.value)
  }

  // Close on outside click / scroll / resize.
  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) close(false)
    }
    function onScroll(e: Event) {
      if (!panelRef.current?.contains(e.target as Node)) close(false)
    }
    const onResize = () => close(false)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  // Focus the search field, or the list, when it opens.
  useLayoutEffect(() => {
    if (!open) return
    const target = panelRef.current?.querySelector<HTMLElement>(searchable ? 'input' : '[role="listbox"]')
    target?.focus()
  }, [open, searchable])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (visible.length ? (i + step + visible.length) % visible.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = visible[Math.min(active, visible.length - 1)]
      if (option) pick(option)
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            openMenu()
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-transparent px-3 py-1.5 text-xs font-heading font-semibold text-text-primary transition hover:bg-bg-card-alt active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
      >
        {label}
        <Chevron open={open} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            onKeyDown={onKeyDown}
            className="fixed z-50 rounded-xl bg-bg-card border border-border shadow-clay p-1.5 animate-[picker-in_120ms_ease-out] motion-reduce:animate-none"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {searchable && (
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                className="mb-1.5 w-full rounded-lg bg-bg-card-alt shadow-clay-press px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-coral"
              />
            )}
            <div
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-label={ariaLabel ?? label}
              aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
              className="max-h-64 overflow-y-auto outline-none"
            >
              {visible.map((option, index) => (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => pick(option)}
                  className={`flex cursor-pointer items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    index === active ? 'bg-bg-card-alt' : ''
                  } ${option.danger ? 'text-coral-dark' : 'text-text-primary'}`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="shrink-0 text-xs text-text-muted">{option.hint}</span>}
                </div>
              ))}
              {visible.length === 0 && <p className="px-3 py-2 text-sm text-text-muted">{q ? 'Nic nenalezeno.' : emptyText}</p>}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
