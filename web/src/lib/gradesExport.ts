// "Export známek": a teacher's overview of grades for a term, as CSV rows.
import type { Cell } from './csv'
import type { PracticeLog } from './data/types'

export interface Period {
  // Local dates, yyyy-mm-dd, both days included.
  from: string
  to: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

// The halves of the school year `today` falls in: 1. 9. – 31. 1. and 1. 2. – 30. 6.
export function schoolHalves(today: Date): { first: Period; second: Period } {
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1 // from August on: the new year
  return {
    first: { from: iso(start, 9, 1), to: iso(start + 1, 1, 31) },
    second: { from: iso(start + 1, 2, 1), to: iso(start + 1, 6, 30) },
  }
}

// The period as timestamps for the query: from midnight to the end of the last day.
export function periodRange(period: Period): { fromIso: string; toIso: string } {
  const [fy, fm, fd] = period.from.split('-').map(Number)
  const [ty, tm, td] = period.to.split('-').map(Number)
  return {
    fromIso: new Date(fy, fm - 1, fd).toISOString(),
    toIso: new Date(ty, tm - 1, td + 1).toISOString(),
  }
}

export interface ExportPupil {
  id: string
  full_name: string
}

const czDate = (value: string) => new Date(value).toLocaleDateString('cs-CZ')
const minutes = (seconds: number) => Math.round((seconds / 60) * 10) / 10

// One row per pupil: recordings, graded, average notes, minutes, last practice.
export function summaryRows(pupils: ExportPupil[], logs: PracticeLog[]): Cell[][] {
  const rows: Cell[][] = [['Žák', 'Nahrávek', 'Ohodnoceno', 'Průměr not (1-5)', 'Minut nahráno', 'Poslední nahrávka']]
  const sorted = [...pupils].sort((a, b) => a.full_name.localeCompare(b.full_name, 'cs'))
  for (const pupil of sorted) {
    const own = logs.filter((l) => l.user_id === pupil.id)
    const rated = own.filter((l) => l.rating)
    const average = rated.length ? Math.round((rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length) * 10) / 10 : null
    const seconds = own.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)
    const last = own.reduce<string | undefined>((m, l) => (!m || l.created_at > m ? l.created_at : m), undefined)
    rows.push([pupil.full_name, own.length, rated.length, average, minutes(seconds), last ? czDate(last) : null])
  }
  return rows
}

// One row per recording, oldest first within each pupil.
export function detailRows(
  pupils: ExportPupil[],
  logs: PracticeLog[],
  titles: Map<string, string>,
  pieces: Map<string, string>,
): Cell[][] {
  const rows: Cell[][] = [['Žák', 'Datum', 'Úkol / skladba', 'Noty (1-5)', 'Délka (min)', 'Co se povedlo', 'Co zlepšit']]
  const names = new Map(pupils.map((p) => [p.id, p.full_name]))
  const sorted = logs
    .filter((l) => names.has(l.user_id))
    .sort(
      (a, b) =>
        (names.get(a.user_id) ?? '').localeCompare(names.get(b.user_id) ?? '', 'cs') || a.created_at.localeCompare(b.created_at),
    )
  for (const log of sorted) {
    const what = log.assignment_id
      ? (titles.get(log.assignment_id) ?? 'úkol')
      : log.own_piece_id
        ? `${pieces.get(log.own_piece_id) ?? 'vlastní skladba'}`
        : 'volné cvičení'
    rows.push([
      names.get(log.user_id),
      czDate(log.created_at),
      what,
      log.rating ?? null,
      log.duration_seconds != null ? minutes(log.duration_seconds) : null,
      log.feedback_good,
      log.feedback_improve,
    ])
  }
  return rows
}

// "znamky-prehled-housle-2026-09-01-2027-01-31.csv"
export function exportFilename(kind: 'prehled' | 'detail', group: string, period: Period): string {
  const slug = group
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `znamky-${kind}-${slug || 'zaci'}-${period.from}-${period.to}.csv`
}
