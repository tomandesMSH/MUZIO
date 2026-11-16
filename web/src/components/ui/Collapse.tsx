import type { ReactNode } from 'react'

interface CollapseProps {
  open: boolean
  id?: string
  children: ReactNode
}

// Slides its content open and shut. Animating grid rows 0fr -> 1fr gives the
// content's natural height without measuring it in JavaScript. The content
// stays mounted, so closing animates too; while closed it's inert (not
// focusable, hidden from screen readers). "Reduce motion" skips the slide.
export function Collapse({ open, id, children }: CollapseProps) {
  return (
    <div
      id={id}
      inert={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

// The ▼ next to an expandable title; turns to point up when open.
export function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block text-text-muted text-xs transition-transform duration-300 ease-out motion-reduce:transition-none ${
        open ? 'rotate-180' : ''
      }`}
    >
      ▼
    </span>
  )
}
