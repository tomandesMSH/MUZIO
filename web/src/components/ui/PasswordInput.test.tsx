import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('hides the password until the eye button is pressed, then hides it again', () => {
    render(<PasswordInput placeholder="Heslo" defaultValue="tajne123" />)
    const input = screen.getByPlaceholderText('Heslo')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Zobrazit heslo' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('tajne123')

    fireEvent.click(screen.getByRole('button', { name: 'Skrýt heslo' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('does not submit the surrounding form when toggled', () => {
    let submitted = false
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitted = true
        }}
      >
        <PasswordInput placeholder="Heslo" />
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Zobrazit heslo' }))
    expect(submitted).toBe(false)
  })
})
