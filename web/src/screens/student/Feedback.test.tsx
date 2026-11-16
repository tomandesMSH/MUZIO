import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Feedback } from './Feedback'
import { markFeedbackSeen } from '../../lib/data/practiceLogs'
import { refreshNavBadges } from '../../lib/navBadges'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'u1' } }) }))
vi.mock('../../lib/data/badges', () => ({ fetchAwardedBadges: async () => [], awardsByLog: () => new Map() }))
vi.mock('../../lib/data/moderation', () => ({ reportContent: vi.fn() }))
vi.mock('../../components/audio/RecordingAudio', () => ({ RecordingAudio: () => null }))
vi.mock('../../components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('../../lib/navBadges', () => ({ refreshNavBadges: vi.fn() }))
vi.mock('../../lib/data/practiceLogs', () => ({
  markFeedbackSeen: vi.fn(async () => {}),
  fetchOwnLogs: async () => [
    { id: 1, user_id: 'u1', created_at: '2026-11-16T10:00:00Z', rating: 4, feedback_seen_at: null, duration_seconds: 60 },
    { id: 2, user_id: 'u1', created_at: '2026-11-15T10:00:00Z', rating: 3, feedback_seen_at: '2026-11-15T12:00:00Z', duration_seconds: 60 },
    { id: 3, user_id: 'u1', created_at: '2026-11-16T11:00:00Z', rating: null, feedback_seen_at: null, duration_seconds: 60 },
  ],
}))

describe('Feedback', () => {
  it('marks new grades "Nové" and as seen, then updates the menu number', async () => {
    render(
      <MemoryRouter>
        <Feedback />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Nové')).toBeInTheDocument()
    expect(screen.getAllByText('Nové')).toHaveLength(1)
    expect(markFeedbackSeen).toHaveBeenCalledWith([1])
    await waitFor(() => expect(refreshNavBadges).toHaveBeenCalled())
  })
})
