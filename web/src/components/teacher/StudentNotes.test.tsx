import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentNotes } from './StudentNotes'

const m = vi.hoisted(() => ({
  fetch: vi.fn(),
  save: vi.fn(async () => {}),
}))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 't1' } }) }))
vi.mock('../../lib/data/teacherNotes', () => ({
  NOTE_MAX: 4000,
  fetchTeacherNote: m.fetch,
  saveTeacherNote: m.save,
}))

afterEach(() => {
  vi.useRealTimers()
  m.save.mockClear()
})

describe('StudentNotes', () => {
  it('loads the note and saves a second after typing stops', async () => {
    m.fetch.mockResolvedValue({ body: 'Legato', updated_at: '2026-11-01T10:00:00Z' })
    render(<StudentNotes studentId="s1" />)
    const box = await screen.findByLabelText('Moje poznámky k žákovi')
    expect(box).toHaveValue('Legato')
    vi.useFakeTimers()
    fireEvent.change(box, { target: { value: 'Legato, takt 8' } })
    expect(m.save).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(m.save).toHaveBeenCalledWith('t1', 's1', 'Legato, takt 8')
    expect(screen.getByText('Uloženo ✓')).toBeInTheDocument()
  })

  it('saves what is left when closed early', async () => {
    m.fetch.mockResolvedValue(undefined)
    const { unmount } = render(<StudentNotes studentId="s1" />)
    fireEvent.change(await screen.findByLabelText('Moje poznámky k žákovi'), { target: { value: 'Rychle' } })
    unmount()
    expect(m.save).toHaveBeenCalledWith('t1', 's1', 'Rychle')
  })

  it('says so when notes are not available', async () => {
    m.fetch.mockRejectedValue(new Error('relation does not exist'))
    render(<StudentNotes studentId="s1" />)
    expect(await screen.findByText(/Poznámky zatím nejdou načíst/)).toBeInTheDocument()
  })
})
