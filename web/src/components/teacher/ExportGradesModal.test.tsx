import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExportGradesModal } from './ExportGradesModal'
import type { Profile } from '../../lib/data/types'

const m = vi.hoisted(() => ({
  download: vi.fn(),
  fetchLogs: vi.fn(async (_ids: string[]) => [] as unknown[]),
}))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 't1' } }) }))
vi.mock('../../lib/data/classrooms', () => ({
  fetchReviewContext: async () => ({
    classrooms: [{ id: 'c1', name: 'Housle' }],
    membersOf: new Map([['c1', new Set(['a'])]]),
    titles: new Map(),
  }),
}))
vi.mock('../../lib/data/practiceLogs', () => ({ fetchLogsForExport: m.fetchLogs }))
vi.mock('../../lib/data/ownPieces', () => ({ fetchPiecesByIds: async () => new Map() }))
vi.mock('../../lib/csv', () => ({ downloadCsv: m.download }))

const students = [
  { id: 'a', full_name: 'Adam', is_approved: true },
  { id: 'b', full_name: 'Bára', is_approved: true },
  { id: 'c', full_name: 'Čeká', is_approved: false },
] as Profile[]

describe('ExportGradesModal', () => {
  it('exports the chosen class for the chosen half-year', async () => {
    render(<ExportGradesModal students={students} onClose={() => {}} />)
    expect(screen.getByText('Žáků: 2')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('radio', { name: 'Housle' }))
    expect(screen.getByText('Žáků: 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '1. pololetí' }))
    fireEvent.click(screen.getByRole('button', { name: '⬇ Přehled (řádek za žáka)' }))
    await waitFor(() => expect(m.download).toHaveBeenCalled())
    expect(m.fetchLogs.mock.calls[0][0]).toEqual(['a'])
    const [filename, rows] = m.download.mock.calls[0]
    expect(filename).toMatch(/^znamky-prehled-housle-\d{4}-09-01-\d{4}-01-31\.csv$/)
    expect(rows[1][0]).toBe('Adam')
    expect(await screen.findByText('Staženo (0 nahrávek)')).toBeInTheDocument()
  })
})
