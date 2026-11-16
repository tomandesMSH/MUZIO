import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnnouncementsCard } from './AnnouncementsCard'

vi.mock('../../lib/data/announcements', () => ({
  fetchMyAnnouncements: async () => [
    { id: 'n1', classroom_id: 'c1', teacher_id: 't1', body: 'V pátek koncert v 17:00', created_at: '2026-11-16T10:00:00Z', classroom_name: 'Housle' },
  ],
}))
vi.mock('../../lib/data/classrooms', () => ({ fetchMyTeacherNames: async () => new Map([['t1', 'Jana Nováková']]) }))

describe('AnnouncementsCard', () => {
  beforeEach(() => localStorage.clear())

  it('shows the announcement with its teacher and class', async () => {
    render(<AnnouncementsCard />)
    expect(await screen.findByText('V pátek koncert v 17:00')).toBeInTheDocument()
    expect(await screen.findByText(/Jana Nováková · Housle/)).toBeInTheDocument()
  })

  it('"Rozumím" hides it, also next time', async () => {
    const { unmount } = render(<AnnouncementsCard />)
    fireEvent.click(await screen.findByText('Rozumím ✓'))
    expect(screen.queryByText('V pátek koncert v 17:00')).toBeNull()
    unmount()
    render(<AnnouncementsCard />)
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText('V pátek koncert v 17:00')).toBeNull()
  })
})
