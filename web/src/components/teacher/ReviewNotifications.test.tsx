import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ReviewNotificationsButton } from './ReviewNotifications'
import { markReviewSeen } from '../../lib/data/reviewSeen'
import { refreshNavBadges } from '../../lib/navBadges'

vi.mock('../../lib/data/practiceLogs', () => ({
  fetchPendingReview: async () => [
    { id: 1, user_id: 's1', created_at: '2026-11-20T10:00:00Z' },
    { id: 2, user_id: 's2', created_at: '2026-11-22T10:00:00Z' },
  ],
}))
vi.mock('../../lib/data/profiles', () => ({
  fetchStudents: async () => [
    { id: 's1', full_name: 'Starý Záznam' },
    { id: 's2', full_name: 'Laura Krou' },
  ],
}))
vi.mock('../../lib/data/reviewSeen', () => ({
  fetchReviewSeenAt: async () => '2026-11-21T00:00:00Z',
  markReviewSeen: vi.fn(async () => {}),
}))
vi.mock('../../lib/navBadges', () => ({ refreshNavBadges: vi.fn(), useNavBadges: () => ({ 'pending-review': 1 }) }))

describe('ReviewNotificationsButton', () => {
  it('lists what is behind the number and marks it as read', async () => {
    render(
      <MemoryRouter>
        <ReviewNotificationsButton />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Oznámení/ }))
    expect(await screen.findByText('Laura Krou')).toBeInTheDocument()
    expect(screen.queryByText('Starý Záznam')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Označit jako přečtené' }))
    await vi.waitFor(() => expect(refreshNavBadges).toHaveBeenCalled())
    expect(markReviewSeen).toHaveBeenCalled()
  })
})
