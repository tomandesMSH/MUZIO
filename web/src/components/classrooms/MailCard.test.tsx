import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MailCard } from './MailCard'
import { markMessageRead } from '../../lib/data/pupilMessages'

vi.mock('../../lib/navBadges', () => ({ refreshNavBadges: vi.fn() }))
vi.mock('../../lib/data/classrooms', () => ({ fetchMyTeacherNames: async () => new Map([['t1', 'Jana Nováková']]) }))
vi.mock('../../lib/data/pupilMessages', () => ({
  markMessageRead: vi.fn(async () => {}),
  fetchMyMessages: async () => [
    { id: 'm1', teacher_id: 't1', student_id: 'p1', body: 'Starší, přečtená', created_at: '2026-11-20T10:00:00Z', read_at: '2026-11-20T11:00:00Z' },
    { id: 'm2', teacher_id: 't1', student_id: 'p1', body: 'Nová zpráva', created_at: '2026-11-19T10:00:00Z', read_at: null },
    { id: 'm3', teacher_id: null, student_id: 'p1', body: 'Pochvala z Base44', created_at: '2026-11-17T10:00:00Z', read_at: '2026-11-17T10:00:00Z' },
  ],
}))

describe('MailCard', () => {
  it('puts unread first and marks one read', async () => {
    render(<MailCard studentId="p1" />)
    expect(await screen.findByText('Z předchozí aplikace')).toBeInTheDocument()
    const bodies = await screen.findAllByText(/zpráva|přečtená/)
    expect(bodies[0]).toHaveTextContent('Nová zpráva')
    expect(await screen.findAllByText('Jana Nováková')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Přečteno' }))
    await waitFor(() => expect(markMessageRead).toHaveBeenCalledWith('m2'))
    expect(screen.queryByRole('button', { name: 'Přečteno' })).toBeNull()
  })
})
