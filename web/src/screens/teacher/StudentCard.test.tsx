import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { StudentCard } from './StudentCard'

const nav = vi.hoisted(() => ({ to: vi.fn() }))
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => nav.to,
}))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 't1' } }) }))
vi.mock('../../components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('../../components/teacher/StudentNotes', () => ({ StudentNotes: () => <div>poznámky</div> }))
vi.mock('../../components/classrooms/AssignToStudentModal', () => ({ AssignToStudentModal: () => null }))
vi.mock('../../lib/data/profiles', () => ({
  fetchStudents: async () => [{ id: 's1', full_name: 'Adam Novák', streak: 4, xp: 120, stars: 2, is_approved: true }],
}))
vi.mock('../../lib/data/practiceLogs', () => ({
  fetchStudentLogs: async () => [
    { id: 9, user_id: 's1', created_at: '2026-11-16T10:00:00Z', duration_seconds: 60, teacher_comment: null, rating: null, student_note: 'takt 8' },
    { id: 8, user_id: 's1', created_at: '2026-11-10T10:00:00Z', duration_seconds: 60, teacher_comment: 'x', rating: 4, feedback_good: 'Hezky' },
  ],
}))
vi.mock('../../lib/data/classrooms', () => ({
  fetchPupilAssignments: async () => [
    { assignment: { id: 'a1', title: 'Stupnice C dur', due_date: null }, classroomName: 'Housle', done: true },
    { assignment: { id: 'a2', title: 'Etuda 3', due_date: null }, classroomName: 'Housle', done: false },
  ],
}))

const renderCard = () =>
  render(
    <MemoryRouter initialEntries={['/teacher/students/s1']}>
      <Routes>
        <Route path="/teacher/students/:id" element={<StudentCard />} />
      </Routes>
    </MemoryRouter>,
  )

describe('StudentCard', () => {
  it('shows the pupil at a glance', async () => {
    renderCard()
    expect(await screen.findByText('Adam Novák')).toBeInTheDocument()
    expect(await screen.findByText('Úkoly · hotovo 1 z 2')).toBeInTheDocument()
    expect(screen.getByText('Etuda 3')).toBeInTheDocument()
    expect(screen.getByText('Hezky')).toBeInTheDocument()
    expect(screen.getByText('Všechny nahrávky (1 čeká)')).toBeInTheDocument()
    expect(screen.getByText('poznámky')).toBeInTheDocument()
  })

  it('opens a recording for grading', async () => {
    renderCard()
    fireEvent.click(await screen.findByText('Ohodnotit'))
    expect(nav.to).toHaveBeenCalledWith('/teacher/grading', { state: { studentId: 's1', logId: '9' } })
  })
})
