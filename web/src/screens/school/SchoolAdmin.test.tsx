import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SchoolAdmin } from './SchoolAdmin'

const createSchoolInvite = vi.fn(async (_school: string, _role: string) => 'ABCDEFGHJK')
const approve = vi.fn(async (_id: string) => {})
const setVerified = vi.fn(async (_id: string, _on: boolean) => {})

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/auth', () => ({ signOut: async () => {} }))
vi.mock('../../lib/AuthProvider', () => ({
  useAuth: () => ({ profile: { id: 't1', role: 'teacher', is_school_admin: true, school_id: 's2' } }),
}))
vi.mock('../../lib/data/schoolAdmin', () => ({
  fetchSchoolOverview: async () => ({
    school: { id: 's2', name: 'ZUŠ Javorová' },
    teachers: [
      { id: 't1', full_name: 'Eva Malá', username: 'evamala', is_verified: true, is_school_admin: true, classrooms: 2 },
      { id: 't2', full_name: 'Petr Velký', username: 'petrv', is_verified: false, is_school_admin: false, classrooms: 0 },
    ],
    pupils: [
      { id: 'p1', full_name: 'Anna Nová', username: 'annan', is_approved: true, is_banned: false, created_at: null, classrooms: ['Klavír 1'] },
      { id: 'p2', full_name: 'Jan Starý', username: 'jans', is_approved: false, is_banned: false, created_at: null, classrooms: [] },
    ],
    classrooms: [{ id: 'c1', name: 'Klavír 1', teacher: 'Eva Malá', members: 1 }],
  }),
  approveSchoolPupil: (id: string) => approve(id),
  setSchoolTeacherVerified: (id: string, on: boolean) => setVerified(id, on),
}))
vi.mock('../../lib/data/schools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/data/schools')>()),
  fetchOpenInvites: async () => [
    { id: 'i1', school_id: 's2', role: 'teacher', code: 'KMNPQRSTUV', expires_at: '2026-12-08T10:00:00Z', created_at: '2026-11-24' },
  ],
  createSchoolInvite: (school: string, role: string) => createSchoolInvite(school, role),
}))

function renderPanel() {
  return render(
    <MemoryRouter>
      <SchoolAdmin />
    </MemoryRouter>,
  )
}

describe('SchoolAdmin', () => {
  it('shows the teachers of the school and its open links, and makes a new one', async () => {
    renderPanel()
    expect(await screen.findByText('ZUŠ Javorová')).toBeInTheDocument()
    expect(screen.getByText('Petr Velký')).toBeInTheDocument()
    expect(screen.getByText('neověřený')).toBeInTheDocument()
    expect(screen.getByText('evamala · 2 třídy')).toBeInTheDocument()
    expect(await screen.findByDisplayValue(/\/skola\/KMNPQRSTUV$/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nový odkaz pro učitele' }))
    await waitFor(() => expect(createSchoolInvite).toHaveBeenCalledWith('s2', 'teacher'))
  })

  it('lists the pupils with their classes and finds them by name', async () => {
    renderPanel()
    await screen.findByText('ZUŠ Javorová')
    fireEvent.click(screen.getByRole('tab', { name: 'Žáci' }))
    expect(screen.getByText('annan · Klavír 1')).toBeInTheDocument()
    expect(screen.getByText('čeká na schválení')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Hledat žáka'), { target: { value: 'anna' } })
    expect(screen.queryByText('Jan Starý')).not.toBeInTheDocument()
  })

  it('lists the classes', async () => {
    renderPanel()
    await screen.findByText('ZUŠ Javorová')
    fireEvent.click(screen.getByRole('tab', { name: 'Třídy' }))
    expect(screen.getByText('1 žák')).toBeInTheDocument()
  })

  it('verifies a teacher, but not oneself', async () => {
    renderPanel()
    await screen.findByText('ZUŠ Javorová')
    // Eva Malá (t1) is the signed-in admin: no button for her.
    expect(screen.getAllByRole('button', { name: /Ověřit|Zrušit ověření/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Ověřit' }))
    await waitFor(() => expect(setVerified).toHaveBeenCalledWith('t2', true))
  })

  it('approves a waiting pupil', async () => {
    renderPanel()
    await screen.findByText('ZUŠ Javorová')
    fireEvent.click(screen.getByRole('tab', { name: 'Žáci' }))
    fireEvent.click(screen.getByRole('button', { name: 'Schválit' }))
    await waitFor(() => expect(approve).toHaveBeenCalledWith('p2'))
  })
})
