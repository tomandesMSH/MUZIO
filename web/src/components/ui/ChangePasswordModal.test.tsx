import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChangePasswordModal } from './ChangePasswordModal'
import { changeOwnPassword, reauthenticate } from '../../lib/auth'

vi.mock('../../lib/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { email: 'jannovak@keyboardhero.internal' } } }),
}))
vi.mock('../../lib/auth', () => ({ changeOwnPassword: vi.fn(), reauthenticate: vi.fn() }))

const reauth = vi.mocked(reauthenticate)
const change = vi.mocked(changeOwnPassword)

function fill(current: string, next: string, repeat = next) {
  const [a, b, c] = document.querySelectorAll('input')
  fireEvent.change(a, { target: { value: current } })
  fireEvent.change(b, { target: { value: next } })
  fireEvent.change(c, { target: { value: repeat } })
  fireEvent.click(screen.getByRole('button', { name: 'Změnit heslo' }))
}

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    reauth.mockReset().mockResolvedValue(undefined)
    change.mockReset().mockResolvedValue(undefined)
  })

  it('checks the current password, then sets the new one', async () => {
    const onChanged = vi.fn()
    render(<ChangePasswordModal onClose={() => {}} onChanged={onChanged} />)
    fill('docasne8', 'mojeheslo')
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(reauth).toHaveBeenCalledWith('jannovak@keyboardhero.internal', 'docasne8')
    expect(change).toHaveBeenCalledWith('mojeheslo')
  })

  it('does not change anything when the new passwords differ', async () => {
    render(<ChangePasswordModal onClose={() => {}} onChanged={() => {}} />)
    fill('docasne8', 'mojeheslo', 'mojeheslx')
    expect(await screen.findByRole('alert')).toHaveTextContent('Nová hesla se neshodují.')
    expect(reauth).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
  })

  it('rejects a wrong current password without changing it', async () => {
    reauth.mockRejectedValue(new Error('Invalid login credentials'))
    const onChanged = vi.fn()
    render(<ChangePasswordModal onClose={() => {}} onChanged={onChanged} />)
    fill('spatne', 'mojeheslo')
    expect(await screen.findByRole('alert')).toHaveTextContent('Současné heslo není správné.')
    expect(change).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
  })
})
