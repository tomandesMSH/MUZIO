import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SchoolsSection } from './SchoolsSection'

const createSchool = vi.fn(async (_name: string) => 's2')
const createSchoolInvite = vi.fn(async (_school: string, _role: string) => 'ABCDEFGHJK')

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/data/schools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/data/schools')>()),
  fetchSchools: async () => [
    { id: 's1', name: 'Výchozí škola', is_active: true, created_at: '2026-11-24', is_default: true, teachers: 3, pupils: 40, classrooms: 5, admins: [] },
    { id: 's2', name: 'ZUŠ Javorová', is_active: true, created_at: '2026-11-24', is_default: false, teachers: 1, pupils: 0, classrooms: 0, admins: ['Eva Malá'] },
  ],
  fetchOpenInvites: async () => [
    { id: 'i1', school_id: 's2', role: 'teacher', code: 'KMNPQRSTUV', expires_at: '2026-12-08T10:00:00Z', created_at: '2026-11-24' },
  ],
  createSchool: (name: string) => createSchool(name),
  createSchoolInvite: (school: string, role: string) => createSchoolInvite(school, role),
}))

describe('SchoolsSection', () => {
  it('lists the schools with their numbers, admins and open links', async () => {
    render(<SchoolsSection />)
    expect(await screen.findByText('ZUŠ Javorová')).toBeInTheDocument()
    expect(screen.getByText('3 učitelů · 40 žáků · 5 tříd')).toBeInTheDocument()
    expect(screen.getByText('Správce: Eva Malá')).toBeInTheDocument()
    expect(screen.getByText('Správce: zatím nikdo')).toBeInTheDocument()
    expect(await screen.findByDisplayValue(/\/skola\/KMNPQRSTUV$/)).toBeInTheDocument()
  })

  it('founds a school and makes a link for its admin', async () => {
    render(<SchoolsSection />)
    await screen.findByText('ZUŠ Javorová')
    fireEvent.change(screen.getByLabelText('Název nové školy'), { target: { value: 'ZUŠ Nová' } })
    fireEvent.click(screen.getByRole('button', { name: 'Založit školu' }))
    await waitFor(() => expect(createSchool).toHaveBeenCalledWith('ZUŠ Nová'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Odkaz pro správce' })[1])
    await waitFor(() => expect(createSchoolInvite).toHaveBeenCalledWith('s2', 'school_admin'))
  })
})
