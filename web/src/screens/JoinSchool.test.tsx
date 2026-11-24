import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JoinSchool } from './JoinSchool'
import { peekSchoolCode } from '../lib/data/schools'

const auth = vi.hoisted(() => ({
  value: { session: null as unknown, profile: null as unknown, loading: false, refreshProfile: () => {} },
}))
const redeem = vi.fn(async (_code: string) => {})
const info = vi.hoisted(() => ({ value: { school_name: 'ZUŠ Javorová', role: 'teacher', valid: true } as unknown }))

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/AuthProvider', () => ({ useAuth: () => auth.value }))
vi.mock('../lib/data/schools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/data/schools')>()),
  fetchSchoolInviteInfo: async () => info.value,
  redeemSchoolInvite: (code: string) => redeem(code),
}))

function renderAt(code: string) {
  return render(
    <MemoryRouter initialEntries={[`/skola/${code}`]}>
      <Routes>
        <Route path="/skola/:code" element={<JoinSchool />} />
        <Route path="/login" element={<p>Přihlášení</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('JoinSchool', () => {
  beforeEach(() => {
    sessionStorage.clear()
    auth.value = { session: null, profile: null, loading: false, refreshProfile: () => {} }
    info.value = { school_name: 'ZUŠ Javorová', role: 'teacher', valid: true }
  })

  it('signed out: says which school it is for and keeps the code for after signing in', async () => {
    renderAt('ABCDEFGHJK')
    expect(await screen.findByText('ZUŠ Javorová')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Založit učitelský účet' }))
    expect(await screen.findByText('Přihlášení')).toBeInTheDocument()
    expect(peekSchoolCode()).toBe('ABCDEFGHJK')
  })

  it('a teacher joins the school with one tap', async () => {
    auth.value = { session: {}, profile: { role: 'teacher' }, loading: false, refreshProfile: () => {} }
    renderAt('ABCDEFGHJK')
    fireEvent.click(await screen.findByRole('button', { name: 'Přidat se ke škole ZUŠ Javorová' }))
    await waitFor(() => expect(redeem).toHaveBeenCalledWith('ABCDEFGHJK'))
    expect(await screen.findByText('Jsi ve škole ZUŠ Javorová 🎉')).toBeInTheDocument()
  })

  it('a pupil is told the link is for teachers', async () => {
    auth.value = { session: {}, profile: { role: 'student' }, loading: false, refreshProfile: () => {} }
    renderAt('ABCDEFGHJK')
    expect(await screen.findByText(/Tahle pozvánka je pro učitele/)).toBeInTheDocument()
  })

  it('a used or expired link', async () => {
    info.value = { school_name: 'ZUŠ Javorová', role: 'teacher', valid: false }
    renderAt('ABCDEFGHJK')
    expect(await screen.findByText(/Pozvánka neplatí/)).toBeInTheDocument()
  })
})
