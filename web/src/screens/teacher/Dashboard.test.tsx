import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TeacherDashboard } from './Dashboard'
import { markReviewed } from '../../lib/data/practiceLogs'
import { refreshNavBadges, setNavBadgeCount } from '../../lib/navBadges'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 't1' } }) }))
vi.mock('../../lib/data/practiceLogs', () => ({
  fetchPendingReview: async () => [
    { id: 11, user_id: '1', created_at: '2026-11-10T10:00:00Z', assignment_id: 'a1' },
    { id: 12, user_id: '2', created_at: '2026-11-12T10:00:00Z', assignment_id: null },
    { id: 13, user_id: '3', created_at: '2026-11-11T10:00:00Z', assignment_id: 'a1' },
  ],
  markReviewed: vi.fn(async () => {}),
}))
vi.mock('../../lib/data/pupilFlames', () => ({ fetchPupilFlameCounts: async () => new Map([['4', 9]]) }))
vi.mock('../../lib/navBadges', () => ({ refreshNavBadges: vi.fn(), setNavBadgeCount: vi.fn() }))
vi.mock('../../lib/data/classrooms', () => ({
  fetchReviewContext: async () => ({
    classrooms: [
      { id: '3A', name: '3.A' },
      { id: '4B', name: '4.B' },
    ],
    membersOf: new Map([
      ['3A', new Set(['1', '2'])],
      ['4B', new Set(['3'])],
    ]),
    titles: new Map([['a1', 'Stupnice C dur']]),
  }),
}))

const t = new Date()
const ago = (n: number) => {
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
vi.mock('../../lib/data/profiles', () => ({
  fetchStudents: async () => [
    { id: '1', full_name: 'Pavel Novák', streak: 0, last_practice_date: ago(9) },
    { id: '2', full_name: 'Jana Malá', streak: 0, last_practice_date: ago(23) },
    { id: '3', full_name: 'Eva Dlouhá', streak: 0, last_practice_date: null },
    { id: '4', full_name: 'Tomáš Krátký', streak: 4, last_practice_date: ago(1) },
  ],
}))

describe('TeacherDashboard', () => {
  it('lists pupils who have not practised for a week, longest gap first', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Dlouho necvičili (3)')).toBeInTheDocument()
    expect(screen.getByText('3 týdny bez nahrávky')).toBeInTheDocument()
    expect(screen.getByText('9 dní bez nahrávky')).toBeInTheDocument()
    expect(screen.getByText('Zatím nic neposlal(a)')).toBeInTheDocument()
    expect(screen.queryByText('1 dní bez nahrávky')).toBeNull()
  })

  it('hides the section while searching', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    await screen.findByText('Dlouho necvičili (3)')
    fireEvent.change(screen.getByPlaceholderText('Hledat žáka'), { target: { value: 'Pavel' } })
    expect(screen.queryByText(/Dlouho necvičili/)).toBeNull()
  })

  it('"Ke kontrole" filters by class and sorts', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Ke kontrole (3)')).toBeInTheDocument()
    const names = () => screen.getAllByRole('button').map((b) => b.textContent).filter((t) => /Pavel|Jana|Eva/.test(t ?? '') && /2026|11\./.test(t ?? ''))
    expect(names()[0]).toMatch(/Pavel/) // oldest first
    fireEvent.click(screen.getByRole('button', { name: '↑ Nejstarší první' }))
    expect(names()[0]).toMatch(/Jana/)
    fireEvent.click(await screen.findByRole('button', { name: 'Filtrovat podle třídy' }))
    fireEvent.click(screen.getByRole('option', { name: '4.B' }))
    expect(screen.getByText('Ke kontrole (1)')).toBeInTheDocument()
    expect(screen.getByText(/Stupnice C dur/)).toBeInTheDocument()
  })

  it('marks a waiting recording as reviewed and refreshes the menu number', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    const buttons = await screen.findAllByRole('button', { name: 'Označit jako ohodnocené' })
    expect(buttons).toHaveLength(3)
    fireEvent.click(buttons[0])
    await vi.waitFor(() => expect(refreshNavBadges).toHaveBeenCalled())
    expect(markReviewed).toHaveBeenCalledWith(['11'])
  })

  it('marks every recording shown at once, after confirming', async () => {
    vi.mocked(markReviewed).mockClear()
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Označit vše (3)' }))
    expect(markReviewed).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Označit vše' }))
    await vi.waitFor(() => expect(markReviewed).toHaveBeenCalledTimes(1))
    expect(vi.mocked(markReviewed).mock.calls[0][0]).toEqual(expect.arrayContaining(['11', '12', '13']))
  })

  it('shows flames instead of the old streak among the other pupils', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    expect(await screen.findByText('9 plamínků')).toBeInTheDocument()
    expect(screen.queryByText(/Streak/)).toBeNull()
  })

  it('sets the menu number to the recordings waiting on the page', async () => {
    render(
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>,
    )
    await vi.waitFor(() => expect(setNavBadgeCount).toHaveBeenCalledWith('pending-review', 3))
  })
})
