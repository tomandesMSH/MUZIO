import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Classes } from './Classes'

const m = vi.hoisted(() => ({
  join: vi.fn(async () => 'c2'),
  leave: vi.fn(async () => {}),
}))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 's1' } }) }))
vi.mock('../../components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('../../lib/data/classrooms', () => ({
  fetchStudentClassrooms: async () => [{ id: 'c1', name: 'Housle 3.A', teacher_id: 't1' }],
  fetchMyTeacherNames: async () => new Map([['t1', 'Jana Nováková']]),
  fetchStudentAssignments: async () => [
    { id: 'a1', classroom_id: 'c1' },
    { id: 'a2', classroom_id: 'c1' },
    { id: 'a3', classroom_id: 'other' },
  ],
  joinClassroom: m.join,
  leaveClassroom: m.leave,
}))
vi.mock('../../lib/data/practiceLogs', () => ({ fetchCompletedAssignmentIds: async () => new Set(['a1']) }))

const renderPage = () =>
  render(
    <MemoryRouter>
      <Classes />
    </MemoryRouter>,
  )

describe('Classes', () => {
  it('lists the classes with their teacher and how the assignments are going', async () => {
    renderPage()
    expect(await screen.findByText('Housle 3.A')).toBeInTheDocument()
    expect(await screen.findByText('Učitel: Jana Nováková')).toBeInTheDocument()
    expect(await screen.findByText('Úkoly: hotovo 1 z 2')).toBeInTheDocument()
    expect(screen.getByText('Zbývá 1 →')).toBeInTheDocument()
  })

  it('joins with a code', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Kód od učitele'), { target: { value: 'ab12cd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Připojit' }))
    await waitFor(() => expect(m.join).toHaveBeenCalledWith('AB12CD'))
  })

  it('asks before leaving a class', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Opustit' }))
    expect(m.leave).not.toHaveBeenCalled()
    expect(screen.getByText('Opustit třídu Housle 3.A?')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Opustit' }))
    await waitFor(() => expect(m.leave).toHaveBeenCalledWith('c1', 's1'))
  })
})
