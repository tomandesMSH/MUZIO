import { useState } from 'react'
import { Collapse, Chevron } from '../ui/Collapse'
import type { Profile } from '../../lib/data/types'

interface AssignmentProgressProps {
  // Who the assignment is for (already resolved: chosen pupils or the class).
  pupils: Profile[]
  submitted: Set<string>
}

// "Odevzdalo 3/8" under an assignment, opening to the names.
export function AssignmentProgress({ pupils, submitted }: AssignmentProgressProps) {
  const [open, setOpen] = useState(false)
  if (pupils.length === 0) return null
  const done = pupils.filter((p) => submitted.has(p.id)).length
  const sorted = [...pupils].sort(
    (a, b) => Number(submitted.has(a.id)) - Number(submitted.has(b.id)) || a.full_name.localeCompare(b.full_name, 'cs'),
  )
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary"
      >
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-card-alt">
          <span className="block h-full rounded-full bg-coral" style={{ width: `${(done / pupils.length) * 100}%` }} />
        </span>
        Odevzdalo {done}/{pupils.length}
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        <ul className="mt-2 space-y-1 text-xs">
          {sorted.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span aria-hidden className={submitted.has(p.id) ? 'text-coral' : 'text-text-muted'}>
                {submitted.has(p.id) ? '✓' : '○'}
              </span>
              <span className={submitted.has(p.id) ? '' : 'text-text-muted'}>{p.full_name}</span>
              <span className="sr-only">{submitted.has(p.id) ? 'odevzdal(a)' : 'zatím ne'}</span>
            </li>
          ))}
        </ul>
      </Collapse>
    </div>
  )
}
