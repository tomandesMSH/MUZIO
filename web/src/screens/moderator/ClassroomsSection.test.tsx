import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ClassroomsSection } from './ClassroomsSection'
import { deleteClassroomAsAdmin, moveStudent, transferClassroom } from '../../lib/data/adminClassrooms'
import type { Profile } from '../../lib/data/types'

const base = { stars: 0, streak: 0, is_approved: true, is_banned: false, is_verified: true, username: null }
vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ session: null }) }))
vi.mock('../../lib/reauth', () => ({ isReauthed: () => true }))
vi.mock('../../lib/data/profiles', () => ({
  fetchAllUsers: vi.fn(async () =>
    [
      { ...base, id: 't1', full_name: 'Učitelka Alena', role: 'teacher' },
      { ...base, id: 't2', full_name: 'Učitel Bořek', role: 'teacher' },
      { ...base, id: 'p1', full_name: 'Pavel', role: 'student' },
      { ...base, id: 'p2', full_name: 'Petra', role: 'student' },
    ] as Profile[],
  ),
}))
vi.mock('../../lib/data/adminClassrooms', () => ({
  fetchAllClassrooms: vi.fn(async () => [
    { id: 'c1', teacher_id: 't1', name: '3.A', join_code: 'AAA111', created_at: '' },
    { id: 'c2', teacher_id: 't2', name: '4.B', join_code: 'BBB222', created_at: '' },
  ]),
  fetchAllClassroomMembers: vi.fn(async () => [{ classroom_id: 'c1', student_id: 'p1' }]),
  moveStudent: vi.fn(async () => {}),
  transferClassroom: vi.fn(async () => {}),
  deleteClassroomAsAdmin: vi.fn(async () => {}),
}))

async function openClass(name: string) {
  fireEvent.click(await screen.findByText(name))
  return screen.getByText(name).closest('div.rounded-2xl') as HTMLElement
}

describe('ClassroomsSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists every class with its teacher, code and pupil count', async () => {
    render(<ClassroomsSection />)
    expect(await screen.findByText(/Učitelka Alena · kód/)).toHaveTextContent('AAA111 · 1 žák')
    expect(screen.getByText(/Učitel Bořek · kód/)).toHaveTextContent('BBB222 · 0 žáků')
  })

  it('moves a pupil to another class and adds one', async () => {
    render(<ClassroomsSection />)
    const card = await openClass('3.A')
    fireEvent.change(within(card).getByLabelText('Přesunout: Pavel'), { target: { value: 'c2' } })
    await waitFor(() => expect(moveStudent).toHaveBeenCalledWith('p1', 'c1', 'c2'))
    fireEvent.change(within(card).getByLabelText('Přidat žáka do 3.A'), { target: { value: 'p2' } })
    await waitFor(() => expect(moveStudent).toHaveBeenCalledWith('p2', null, 'c1'))
  })

  it('hands a class over and deletes one after confirming', async () => {
    render(<ClassroomsSection />)
    const card = await openClass('3.A')
    fireEvent.change(within(card).getByLabelText('Předat třídu 3.A'), { target: { value: 't2' } })
    await waitFor(() => expect(transferClassroom).toHaveBeenCalledWith('c1', 't2'))
    fireEvent.click(within(card).getByRole('button', { name: 'Smazat třídu' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Smazat třídu' }))
    await waitFor(() => expect(deleteClassroomAsAdmin).toHaveBeenCalledWith('c1'))
  })
})
