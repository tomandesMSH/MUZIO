import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { detailRows, exportFilename, periodRange, schoolHalves, summaryRows } from './gradesExport'
import type { PracticeLog } from './data/types'

const log = (user: string, created: string, extra: Partial<PracticeLog> = {}) =>
  ({
    id: Math.random(),
    user_id: user,
    created_at: created,
    rating: null,
    duration_seconds: 60,
    assignment_id: null,
    own_piece_id: null,
    feedback_good: null,
    feedback_improve: null,
    ...extra,
  }) as unknown as PracticeLog

describe('toCsv', () => {
  it('opens in Czech Excel: BOM, semicolons, decimal comma, quoting', () => {
    expect(toCsv([['Žák', 4.5, null], ['a;b', 'řekl "ahoj"', 'dva\nřádky']])).toBe(
      '﻿Žák;4,5;\r\n"a;b";"řekl ""ahoj""";"dva\nřádky"\r\n',
    )
  })

  it('keeps formula-looking text as text', () => {
    expect(toCsv([['=1+1', '- tempo', '+x']])).toBe("﻿'=1+1;'- tempo;'+x\r\n")
  })
})

describe('schoolHalves', () => {
  it('the school year the date is in', () => {
    expect(schoolHalves(new Date(2026, 10, 16))).toEqual({
      first: { from: '2026-09-01', to: '2027-01-31' },
      second: { from: '2027-02-01', to: '2027-06-30' },
    })
    expect(schoolHalves(new Date(2027, 2, 1)).first.from).toBe('2026-09-01')
  })

  it('includes the whole last day', () => {
    const { fromIso, toIso } = periodRange({ from: '2026-09-01', to: '2026-09-01' })
    expect(new Date(toIso).getTime() - new Date(fromIso).getTime()).toBe(24 * 3600 * 1000)
  })
})

describe('rows', () => {
  const pupils = [
    { id: 'b', full_name: 'Šárka' },
    { id: 'a', full_name: 'Adam' },
  ]
  const logs = [
    log('a', '2026-10-02T10:00:00Z', { rating: 4, duration_seconds: 90, assignment_id: 'as1', feedback_good: 'Hezky' }),
    log('a', '2026-10-01T10:00:00Z', { rating: 5, own_piece_id: 'p1' }),
    log('a', '2026-10-03T10:00:00Z'),
  ]

  it('summary per pupil', () => {
    const rows = summaryRows(pupils, logs)
    expect(rows[1]).toEqual(['Adam', 3, 2, 4.5, 3.5, new Date('2026-10-03T10:00:00Z').toLocaleDateString('cs-CZ')])
    expect(rows[2]).toEqual(['Šárka', 0, 0, null, 0, null])
  })

  it('detail per recording', () => {
    const rows = detailRows(pupils, logs, new Map([['as1', 'Stupnice C dur']]), new Map([['p1', 'Moje píseň']]))
    expect(rows.slice(1).map((r) => r[2])).toEqual(['Moje píseň', 'Stupnice C dur', 'volné cvičení'])
    expect(rows[2][5]).toBe('Hezky')
    expect(rows[2][4]).toBe(1.5)
  })

  it('a tidy file name', () => {
    expect(exportFilename('prehled', 'Housle – začátečníci', { from: '2026-09-01', to: '2027-01-31' })).toBe(
      'znamky-prehled-housle-zacatecnici-2026-09-01-2027-01-31.csv',
    )
  })
})
