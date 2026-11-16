import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CopyAssignmentModal } from './CopyAssignmentModal'

const assignment = {
  id: 'a1',
  classroom_id: 'c1',
  teacher_id: 't1',
  title: 'Stupnice',
  description: 'v tempu 80',
  created_at: '',
  due_date: '2026-11-20',
  attachment_path: 'a1/noty.mid',
  attachment_name: 'noty.mid',
}
const classrooms = [
  { id: 'c1', name: '3.A', teacher_id: 't1', join_code: 'X', created_at: '' },
  { id: 'c2', name: '4.B', teacher_id: 't1', join_code: 'Y', created_at: '' },
]

describe('CopyAssignmentModal', () => {
  it('copies the task to another class, without the old deadline, with the score', () => {
    const onSubmit = vi.fn()
    render(<CopyAssignmentModal assignment={assignment} classrooms={classrooms} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />)
    expect(screen.getByRole('radio', { name: '3.A' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: '4.B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zadat' }))
    expect(onSubmit).toHaveBeenCalledWith({
      classroomId: 'c2',
      title: 'Stupnice',
      description: 'v tempu 80',
      dueDate: '',
      withAttachment: true,
    })
  })

  it('the score can be left out', () => {
    const onSubmit = vi.fn()
    render(<CopyAssignmentModal assignment={assignment} classrooms={classrooms} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByLabelText(/Přiložit stejné noty/))
    fireEvent.click(screen.getByRole('button', { name: 'Zadat' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ withAttachment: false }))
  })
})
