import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { WeeklyOverview } from './WeeklyOverview'

const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()

vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 't1' } }) }))
vi.mock('../../lib/data/classrooms', () => ({
  fetchReviewContext: async () => ({
    classrooms: [{ id: 'c1', name: 'Housle' }],
    membersOf: new Map([['c1', new Set(['a', 'b'])]]),
    titles: new Map(),
  }),
}))
vi.mock('../../lib/data/practiceLogs', () => ({
  fetchLogsForExport: async () => [{ user_id: 'a', created_at: recent(0.01), duration_seconds: 180, assignment_id: 'x' }],
}))

describe('WeeklyOverview', () => {
  // A Wednesday noon, so "this week" never depends on when the test runs.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 18, 12))
  })
  afterAll(() => vi.useRealTimers())

  it('shows each class this week', async () => {
    render(<WeeklyOverview />)
    expect(await screen.findByText('Housle')).toBeInTheDocument()
    expect(screen.getByLabelText('Cvičilo 1 z 2 žáků')).toBeInTheDocument()
    expect(screen.getByText(/nahrávek k úkolům/)).toBeInTheDocument()
  })
})
