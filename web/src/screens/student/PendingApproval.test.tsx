import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PendingApproval } from './PendingApproval'

const joinClassroom = vi.fn(async (_code: string) => 'c1')
const refreshProfile = vi.fn()

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/auth', () => ({ signOut: async () => {} }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ refreshProfile }) }))
vi.mock('../../lib/data/classrooms', () => ({ joinClassroom: (code: string) => joinClassroom(code) }))

describe('PendingApproval', () => {
  it('joins a class with the code and reloads the profile (approved by the code)', async () => {
    render(
      <MemoryRouter>
        <PendingApproval />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Kód třídy'), { target: { value: 'ab12cd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Připojit se do třídy' }))
    await waitFor(() => expect(joinClassroom).toHaveBeenCalledWith('AB12CD'))
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled())
  })
})
