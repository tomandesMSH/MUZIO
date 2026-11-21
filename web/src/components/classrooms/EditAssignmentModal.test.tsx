import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditAssignmentModal } from './EditAssignmentModal'
import { toDateKey } from '../../lib/game-logic'

// Always ahead: the date field doesn't accept a day before today, and a fixed
// date in the past made the form refuse to save once that day had passed.
const DUE = toDateKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

const assignment = {
  id: 'a1',
  classroom_id: 'c1',
  teacher_id: 't1',
  title: 'Stupnice',
  description: 'v tempu 80',
  created_at: '',
  due_date: DUE,
  stars_reward: 2,
  attachment_path: 'a1/stara.mid',
  attachment_name: 'stara.mid',
}

describe('EditAssignmentModal', () => {
  it('starts from the assignment and saves the changes', () => {
    const onSubmit = vi.fn()
    render(<EditAssignmentModal assignment={assignment} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />)
    expect(screen.getByLabelText('Nadpis')).toHaveValue('Stupnice')
    expect(screen.getByText('stara.mid')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nadpis'), { target: { value: 'Stupnice C dur' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uložit' }))
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Stupnice C dur',
      description: 'v tempu 80',
      dueDate: DUE,
      starsReward: 2,
      attachment: { kind: 'keep' },
    })
  })

  it('can drop the score, and take that back', () => {
    const onSubmit = vi.fn()
    render(<EditAssignmentModal assignment={assignment} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Odebrat' }))
    expect(screen.getByText(/se po uložení odeberou/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Uložit' }))
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ attachment: { kind: 'remove' } }))
    fireEvent.click(screen.getByRole('button', { name: 'Vrátit' }))
    expect(screen.getByText('stara.mid')).toBeInTheDocument()
  })

  it('"Nahradit" waits for a new file before saving', () => {
    render(<EditAssignmentModal assignment={assignment} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nahradit' }))
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Ponechat původní noty' }))
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeEnabled()
  })
})

describe('EditAssignmentModal stars', () => {
  it('changes the reward for completing it', () => {
    const onSubmit = vi.fn()
    render(<EditAssignmentModal assignment={assignment} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/Odměna za splnění/), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uložit' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ starsReward: 5 }))
  })
})
