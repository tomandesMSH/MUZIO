import type { ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import type { DueLabel } from '../../lib/dueDate'

const DUE_CLASS: Record<DueLabel['tone'], string> = {
  late: 'text-coral-dark font-semibold',
  soon: 'text-coral font-semibold',
  later: 'text-text-muted',
  done: 'text-text-muted',
}

interface LessonCardProps {
  icon: string
  title: string
  meta: string
  badge: { label: string; tone: 'success' | 'pending' | 'xp' }
  teacherName?: string | null
  // The deadline, if the assignment has one (lib/dueDate.ts).
  due?: DueLabel
  onClick?: () => void
  // Under the card's main row, outside its button (e.g. a file to download -
  // a link can't sit inside a button).
  footer?: ReactNode
}

export function LessonCard({ icon, title, meta, badge, teacherName, due, onClick, footer }: LessonCardProps) {
  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm">
      <button
        className="w-full flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left disabled:pointer-events-none"
        onClick={onClick}
        disabled={!onClick}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-bg-card-alt shadow-clay-sm flex items-center justify-center text-lg">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="font-heading font-semibold text-sm truncate">{title}</div>
            {teacherName && <div className="text-xs font-semibold truncate">Zadal(a): {teacherName}</div>}
            {meta && <div className="text-text-muted text-xs truncate">{meta}</div>}
            {due && <div className={`text-xs ${DUE_CLASS[due.tone]}`}>{due.text}</div>}
          </div>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </button>
      {/* Its own strip under a divider, the full width of the card. */}
      {footer && <div className="mx-3.5 border-t border-border py-2.5">{footer}</div>}
    </div>
  )
}
