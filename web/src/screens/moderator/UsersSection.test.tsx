import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UsersSection } from './UsersSection'
import { setUserAdmin, setUserRole } from '../../lib/data/adminUsers'
import type { Profile } from '../../lib/data/types'

const ME = 'me'
const base = { stars: 0, streak: 0, is_approved: true, is_banned: false, is_verified: true, username: null }
const users = [
  { ...base, id: ME, full_name: 'Já Admin', role: 'teacher', is_moderator: true },
  { ...base, id: 'p1', full_name: 'Pavla Žákyně', role: 'student' },
  { ...base, id: 't1', full_name: 'Tomáš Učitel', role: 'teacher' },
  { ...base, id: 't2', full_name: 'Tereza Učitelka', role: 'teacher', is_moderator: true },
] as Profile[]

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'me' } }) }))
vi.mock('../../lib/data/profiles', () => ({
  fetchAllUsers: vi.fn(async () => users),
  approveStudent: vi.fn(),
  setTeacherVerified: vi.fn(),
}))
vi.mock('../../lib/data/moderation', () => ({ reinstateAccount: vi.fn(), suspendAccount: vi.fn() }))
vi.mock('../../lib/data/adminUsers', () => ({ setUserRole: vi.fn(async () => {}), setUserAdmin: vi.fn(async () => {}) }))
vi.mock('../../lib/reauth', () => ({ isReauthed: () => true }))

const card = async (name: string) => (await screen.findByText(name)).closest('div.rounded-2xl') as HTMLElement

describe('UsersSection - roles and admin rights', () => {
  beforeEach(() => {
    vi.mocked(setUserRole).mockClear()
    vi.mocked(setUserAdmin).mockClear()
  })

  it('offers nothing on your own account', async () => {
    render(<UsersSection />)
    const mine = await card('Já Admin')
    expect(within(mine).queryByRole('button')).toBeNull()
  })

  it('makes a pupil a teacher after confirming', async () => {
    render(<UsersSection />)
    fireEvent.click(within(await card('Pavla Žákyně')).getByRole('button', { name: 'Udělat učitelem' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Udělat učitelem' }))
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
})
