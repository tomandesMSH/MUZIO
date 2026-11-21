import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreviousAttempts } from './PreviousAttempts'
import type { PracticeLog } from '../../lib/data/types'

const attempts = vi.hoisted(() => ({ list: [] as unknown[] }))
vi.mock('../../lib/data/practiceLogs', () => ({ fetchAttempts: async () => attempts.list }))

const log = (id: number, created: string, extra: Partial<PracticeLog> = {}) =>
  ({
    id,
    user_id: 'u1',
    assignment_id: 'a1',
    own_piece_id: null,
    created_at: created,
    audio_url: 'https://x/a.webm',
    rating: null,
    teacher_comment: null,
    feedback_good: null,
    feedback_improve: null,
    ...extra,
  }) as unknown as PracticeLog

describe('PreviousAttempts', () => {
  it('shows nothing for a first attempt', async () => {
    attempts.list = []
    const { container } = render(<PreviousAttempts log={log(3, '2026-11-10T10:00:00Z')} />)
    await new Promise((r) => setTimeout(r, 0))
    expect(container).toBeEmptyDOMElement()
  })

  it('lists the other attempts with their grade and comment', async () => {
    attempts.list = [
      log(4, '2026-11-12T10:00:00Z'),
      log(1, '2026-11-01T10:00:00Z', { rating: 3, teacher_comment: 'x', feedback_improve: 'V 0:12 zrychluješ' }),
    ]
    render(<PreviousAttempts log={log(3, '2026-11-10T10:00:00Z')} />)
    fireEvent.click(await screen.findByText('Další pokusy u tohoto úkolu (2)'))
    expect(screen.getByText(/novější/)).toBeInTheDocument()
    expect(screen.getByText('čeká na hodnocení')).toBeInTheDocument()
    expect(screen.getByLabelText('Hodnocení 3 z 5')).toBeInTheDocument()
    fireEvent.click(screen.getByText('V 0:12 zrychluješ'))
    expect(screen.getByTitle('Přehrát od 0:12')).toBeInTheDocument()
  })
})
