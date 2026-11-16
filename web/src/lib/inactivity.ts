// The teacher's "Dlouho necvičili": pupils with no recording for a while.
import { daysUntil } from './dueDate'

export const INACTIVE_AFTER_DAYS = 7

interface Pupil {
  id: string
  is_approved?: boolean
  is_banned?: boolean
  last_practice_date?: string | null
}

export interface InactivePupil<T> {
  pupil: T
  // Days since the last recording; null = never sent one.
  days: number | null
}

export function inactivePupils<T extends Pupil>(pupils: T[], today: Date, afterDays = INACTIVE_AFTER_DAYS): InactivePupil<T>[] {
  return pupils
    .filter((p) => p.is_approved !== false && !p.is_banned)
    .map((pupil) => ({
      pupil,
      days: pupil.last_practice_date ? -daysUntil(pupil.last_practice_date, today) : null,
    }))
    .filter((p) => p.days === null || p.days >= afterDays)
    // Longest gap first; those who never sent anything after them.
    .sort((a, b) => (a.days === null ? 1 : b.days === null ? -1 : b.days - a.days))
}

export function inactivityText(days: number | null): string {
  if (days === null) return 'Zatím nic neposlal(a)'
  if (days >= 60) return `${Math.floor(days / 30)} měsíce bez nahrávky`
  if (days >= 14) return `${Math.floor(days / 7)} týdny bez nahrávky`
  return `${days} dní bez nahrávky`
}
