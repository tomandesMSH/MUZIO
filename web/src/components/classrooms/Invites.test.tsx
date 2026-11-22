import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { InvitesCard } from './InvitesCard'
import { InviteModal } from './InviteModal'
import { JoinByLink } from '../../screens/JoinByLink'
import { inviteToClassroom, respondToInvite } from '../../lib/data/classroomInvites'
import { joinClassroom } from '../../lib/data/classrooms'

let role = 'student'
vi.mock('../../lib/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'p1' } }, profile: { id: 'p1', role }, loading: false }),
}))
vi.mock('../../lib/data/classrooms', () => ({ joinClassroom: vi.fn(async () => 'c1') }))
vi.mock('../../lib/data/classroomInvites', () => ({
  classroomLink: (code: string) => `https://muzio.test/pripojit/${code}`,
  fetchMyInvites: async () => [{ id: 'i1', classroom_name: 'Klavír 3.A', teacher_name: 'Jana Nováková', created_at: '2026-11-22' }],
  respondToInvite: vi.fn(async () => {}),
  fetchSentInvites: async () => [],
  searchSchoolPupils: async () => [
    { id: 's1', full_name: 'Laura Krou', is_member: false, is_invited: false },
    { id: 's2', full_name: 'Laura Malá', is_member: true, is_invited: false },
  ],
  inviteToClassroom: vi.fn(async () => {}),
  cancelClassroomInvite: vi.fn(async () => {}),
}))

describe('classroom invites', () => {
  it('the pupil accepts an invitation', async () => {
    render(<InvitesCard />)
    expect(await screen.findByText('Pozvánka do třídy „Klavír 3.A“')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Přijmout' }))
    await vi.waitFor(() => expect(respondToInvite).toHaveBeenCalledWith('i1', true))
  })

  it('the class link joins a signed-in pupil', async () => {
    role = 'student'
    render(
      <MemoryRouter initialEntries={['/pripojit/AB12CD']}>
        <Routes>
          <Route path="/pripojit/:code" element={<JoinByLink />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Jsi ve třídě 🎉')).toBeInTheDocument()
    expect(joinClassroom).toHaveBeenCalledWith('AB12CD')
  })

  it('the teacher finds a pupil by name and invites them', async () => {
    render(<InviteModal open classroomId="c1" classroomName="Klavír 3.A" joinCode="AB12CD" onClose={() => {}} />)
    expect(screen.getByLabelText('Odkaz do třídy')).toHaveValue('https://muzio.test/pripojit/AB12CD')
    fireEvent.change(screen.getByLabelText('Hledat žáka'), { target: { value: 'Laura' } })
    expect(await screen.findByText('Laura Krou')).toBeInTheDocument()
    expect(screen.getByText('ve třídě')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pozvat' }))
    await vi.waitFor(() => expect(inviteToClassroom).toHaveBeenCalledWith('c1', 's1'))
  })
})
