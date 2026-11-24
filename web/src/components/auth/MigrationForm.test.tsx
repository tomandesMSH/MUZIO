import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MigrationForm } from './MigrationForm'
import { completeMigration, requestMigrationCode } from '../../lib/migration'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/auth', () => ({ signIn: vi.fn(async () => ({})) }))
vi.mock('../../lib/migration', () => ({
  requestMigrationCode: vi.fn(async () => {}),
  completeMigration: vi.fn(async () => ({ flames: 12, stars: 4, badges: 2 })),
}))

const field = (label: string) => screen.getByText(label).parentElement!.querySelector('input')!

describe('MigrationForm', () => {
  it('sends a code, then makes the account and shows what came over', async () => {
    render(<MigrationForm />)
    fireEvent.change(field('E-mail z předchozí aplikace'), { target: { value: 'pavel@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Poslat kód' }))
    expect(await screen.findByText(/Kód jsme poslali na pavel@example.com/)).toBeInTheDocument()
    expect(requestMigrationCode).toHaveBeenCalledWith('pavel@example.com')

    fireEvent.change(field('Kód z e-mailu'), { target: { value: '12 34 56' } })
    fireEvent.change(field('Celé jméno'), { target: { value: 'Pavel Novák' } })
    fireEvent.change(field('Uživatelské jméno pro MUZIO (bez diakritiky)'), { target: { value: 'PavelN' } })
    fireEvent.change(field('Nové heslo'), { target: { value: 'tajne123' } })
    fireEvent.change(field('Heslo znovu'), { target: { value: 'tajne123' } })
    fireEvent.change(field('Datum narození'), { target: { value: '2000-01-01' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Přenést a vytvořit účet' }))

    expect(await screen.findByText('Hotovo, vítej v MUZIU')).toBeInTheDocument()
    expect(screen.getByText(/12 plamínků, hvězdy 4, odznaky 2/)).toBeInTheDocument()
    expect(completeMigration).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'pavel@example.com', code: '123456', username: 'PavelN', password: 'tajne123' }),
    )
  })

  it('stops when the passwords differ', async () => {
    vi.mocked(completeMigration).mockClear()
    render(<MigrationForm />)
    fireEvent.change(field('E-mail z předchozí aplikace'), { target: { value: 'pavel@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Poslat kód' }))
    await screen.findByText(/Kód jsme poslali/)
    fireEvent.change(field('Kód z e-mailu'), { target: { value: '123456' } })
    fireEvent.change(field('Celé jméno'), { target: { value: 'Pavel' } })
    fireEvent.change(field('Uživatelské jméno pro MUZIO (bez diakritiky)'), { target: { value: 'paveln' } })
    fireEvent.change(field('Nové heslo'), { target: { value: 'tajne123' } })
    fireEvent.change(field('Heslo znovu'), { target: { value: 'jine1234' } })
    fireEvent.change(field('Datum narození'), { target: { value: '2000-01-01' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Přenést a vytvořit účet' }))
    expect(await screen.findByText('Hesla se neshodují.')).toBeInTheDocument()
    expect(completeMigration).not.toHaveBeenCalled()
  })
})
