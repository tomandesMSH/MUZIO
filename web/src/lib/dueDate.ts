// Assignment deadlines (migration 0036): a day without time, "YYYY-MM-DD".
import { toDateKey } from './game-logic'

// "do pátku" - the day after "do".
const UNTIL_DAY = ['neděle', 'pondělí', 'úterý', 'středy', 'čtvrtka', 'pátku', 'soboty']

export type DueTone = 'late' | 'soon' | 'later' | 'done'

export interface DueLabel {
  text: string
  tone: DueTone
}

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole days from today to the deadline (negative = past).
export function daysUntil(dueDate: string, today: Date): number {
  const start = parse(toDateKey(today))
  return Math.round((parse(dueDate).getTime() - start.getTime()) / 86_400_000)
}

export function dueLabel(dueDate: string | null | undefined, today: Date, done = false): DueLabel | undefined {
  if (!dueDate) return undefined
  const date = parse(dueDate)
  const short = `${date.getDate()}. ${date.getMonth() + 1}.`
  if (done) return { text: `Termín ${short}`, tone: 'done' }
  const days = daysUntil(dueDate, today)
  if (days < 0) return { text: `Po termínu (${short})`, tone: 'late' }
  if (days === 0) return { text: 'Odevzdat dnes', tone: 'soon' }
  if (days === 1) return { text: 'Odevzdat zítra', tone: 'soon' }
  if (days < 7) return { text: `Do ${UNTIL_DAY[date.getDay()]}`, tone: days <= 2 ? 'soon' : 'later' }
  return { text: `Do ${short}`, tone: 'later' }
}

// Waiting assignments with the nearest deadline first, then those without a
// deadline (newest first, as before).
export function sortByDue<T extends { due_date?: string | null; created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return b.created_at.localeCompare(a.created_at)
  })
}
