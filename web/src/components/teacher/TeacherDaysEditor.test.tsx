import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TeacherDaysEditor } from './TeacherDaysEditor'
import { addTeacherDay, removeTeacherDay } from '../../lib/data/teacherDays'

vi.mock('../../lib/data/teacherDays', () => ({
  TEACHER_DAY_MAX_BACK: 60,
  earliestTeacherDay: () => '2026-09-23',
  fetchTeacherDays: async () => [{ day: '2026-11-18', note: 'hrála v hodině', teacher_id: 't1' }],
  addTeacherDay: vi.fn(async () => {}),
  removeTeacherDay: vi.fn(async () => {}),
}))

describe('TeacherDaysEditor', () => {
  it('adds a day with a note and refreshes the flames', async () => {
    const onChanged = vi.fn()
    render(<TeacherDaysEditor studentId="s1" onChanged={onChanged} />)
    fireEvent.change(screen.getByPlaceholderText('např. hrál(a) v hodině'), { target: { value: 'video na WhatsApp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Připsat den' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(addTeacherDay).toHaveBeenCalledWith('s1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'video na WhatsApp')
  })

  it('lists added days and removes one', async () => {
    render(<TeacherDaysEditor studentId="s1" />)
    expect(await screen.findByText(/hrála v hodině/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Odebrat' }))
    await waitFor(() => expect(removeTeacherDay).toHaveBeenCalledWith('s1', '2026-11-18'))
  })
})
