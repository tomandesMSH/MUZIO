import { describe, expect, it, vi } from 'vitest'
import { describeAction } from './adminHistory'

vi.mock('../supabase', () => ({ supabase: {} }))

describe('describeAction', () => {
  it('describes the actions logged by the database', () => {
    expect(describeAction({ action: 'ban', details: {} })).toBe('zabanoval(a) účet')
    expect(describeAction({ action: 'set_role', details: { from: 'student', to: 'teacher' } })).toBe(
      'změnil(a) roli: žák → učitel',
    )
    expect(
      describeAction({ action: 'edit_account', details: { full_name_from: 'Jan', full_name_to: 'Jan Novák' } }),
    ).toBe('upravil(a) účet · jméno: Jan → Jan Novák')
    expect(describeAction({ action: 'adjust_stars', details: { delta: -1, stars: 2 } })).toBe('odebral(a) hvězdu (teď 2)')
  })

  it('shows an unknown action by its name rather than nothing', () => {
    expect(describeAction({ action: 'something_new', details: {} })).toBe('something_new')
  })
})
