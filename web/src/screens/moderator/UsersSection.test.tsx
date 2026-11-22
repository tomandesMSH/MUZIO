import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UsersSection } from './UsersSection'
import { deleteAccount, setUserAdmin, setUserRole, updateAccount } from '../../lib/data/adminUsers'
import { adjustStudentStars } from '../../lib/data/practiceLogs'
import type { Profile } from '../../lib/data/types'

const ME = 'me'
const base = { stars: 0, streak: 0, is_approved: true, is_banned: false, is_verified: true, username: null }
const users = [
  { ...base, id: ME, full_name: 'Já Admin', role: 'teacher', is_moderator: true },
  { ...base, id: 'p1', full_name: 'Pavla Žákyně', role: 'student' },
  { ...base, id: 't1', full_name: 'Tomáš Učitel', role: 'teacher' },
  { ...base, id: 't2', full_name: 'Tereza Učitelka', role: 'teacher', is_moderator: true },
] as Profile[]

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'me' } }) }))
vi.mock('../../lib/data/profiles', () => ({
  fetchAllUsers: vi.fn(async () => users),
  approveStudent: vi.fn(),
  setTeacherVerified: vi.fn(),
}))
vi.mock('../../lib/data/moderation', () => ({ reinstateAccount: vi.fn(), suspendAccount: vi.fn() }))
vi.mock('../../lib/data/adminUsers', () => ({
  setUserRole: vi.fn(async () => {}),
  setUserAdmin: vi.fn(async () => {}),
  updateAccount: vi.fn(async () => {}),
  deleteAccount: vi.fn(async () => {}),
}))
vi.mock('../../lib/data/practiceLogs', () => ({ adjustStudentStars: vi.fn(async () => 1) }))
vi.mock('../../lib/reauth', () => ({ isReauthed: () => true }))

const card = async (name: string) => (await screen.findByText(name)).closest('div.rounded-2xl') as HTMLElement

describe('UsersSection - roles and admin rights', () => {
  beforeEach(() => {
    vi.mocked(setUserRole).mockClear()
    vi.mocked(setUserAdmin).mockClear()
  })

  it('on your own account offers only Upravit', async () => {
    render(<UsersSection />)
    const mine = await card('Já Admin')
    expect(within(mine).getAllByRole('button').map((b) => b.textContent)).toEqual(['Upravit'])
  })

  it('renames an account', async () => {
    render(<UsersSection />)
    fireEvent.click(within(await card('Pavla Žákyně')).getByRole('button', { name: 'Upravit' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getAllByRole('textbox')[1], { target: { value: 'pavla.z' } })
    expect(within(dialog).getByText('pavla.z')).toBeInTheDocument() // "sign in with the new name" warning
    fireEvent.click(within(dialog).getByRole('button', { name: 'Uložit' }))
    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('p1', 'Pavla Žákyně', 'pavla.z'))
  })

  it('makes a pupil a teacher after confirming', async () => {
    render(<UsersSection />)
    fireEvent.click(within(await card('Pavla Žákyně')).getByRole('button', { name: 'Změnit na učitele' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Změnit na učitele' }))
    await waitFor(() => expect(setUserRole).toHaveBeenCalledWith('p1', 'teacher'))
  })

  it('gives a verified teacher admin rights', async () => {
    render(<UsersSection />)
    fireEvent.click(within(await card('Tomáš Učitel')).getByRole('button', { name: 'Dát práva admina' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dát práva' }))
    await waitFor(() => expect(setUserAdmin).toHaveBeenCalledWith('t1', true))
  })

  it('lets you take admin rights from another teacher-admin, without everyday actions', async () => {
    render(<UsersSection />)
    const other = await card('Tereza Učitelka')
    expect(within(other).queryByRole('button', { name: 'Nové heslo' })).toBeNull()
    fireEvent.click(within(other).getByRole('button', { name: 'Odebrat práva admina' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Odebrat práva' }))
    await waitFor(() => expect(setUserAdmin).toHaveBeenCalledWith('t2', false))
  })

  it('shows the counters of a pupil and gives a star', async () => {
    render(<UsersSection />)
    const pupil = await card('Pavla Žákyně')
    expect(within(pupil).getByText(/0 XP \(level 1\) · ⭐ 0/)).toBeInTheDocument()
    expect(within(pupil).getByRole('button', { name: 'Odebrat hvězdu: Pavla Žákyně' })).toBeDisabled()
    fireEvent.click(within(pupil).getByRole('button', { name: 'Přidat hvězdu: Pavla Žákyně' }))
    await waitFor(() => expect(adjustStudentStars).toHaveBeenCalledWith('p1', 1))
  })
})

describe('UsersSection - deleting accounts', () => {
  it('deletes a pupil after confirming, but offers no delete for admins', async () => {
    render(<UsersSection />)
    expect(within(await card('Tereza Učitelka')).queryByRole('button', { name: 'Smazat účet' })).toBeNull()
    fireEvent.click(within(await card('Pavla Žákyně')).getByRole('button', { name: 'Smazat účet' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Nejde to vrátit.')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Smazat natrvalo' }))
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('p1'))
  })
})
