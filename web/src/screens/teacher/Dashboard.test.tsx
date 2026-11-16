import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TeacherDashboard } from './Dashboard'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('../../lib/data/practiceLogs', () => ({ fetchPendingReview: async () => [] }))

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
})
