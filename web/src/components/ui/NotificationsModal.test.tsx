import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsModal } from './NotificationsModal'
import { base64UrlToBytes, pushErrorText } from '../../lib/push'

const db = vi.hoisted(() => ({
  saved: [] as unknown[],
  row: null as Record<string, unknown> | null,
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: null }) }) }),
      upsert: async (row: unknown) => {
        db.saved.push(row)
        return { error: null }
      },
    }),
  },
}))

describe('NotificationsModal', () => {
  beforeEach(() => {
    db.saved = []
    db.row = null
  })

  it('pupil: graded, assignments and the reminder with its hour', async () => {
    db.row = { reminder_hour: 19 }
    render(<NotificationsModal role="student" userId="u1" onClose={() => {}} />)
    expect(screen.getByText('Ohodnocená nahrávka')).toBeInTheDocument()
    expect(screen.getByText('Nový úkol')).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: '19:00' })).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByRole('radio', { name: '20:00' }))
    await waitFor(() => expect(db.saved).toHaveLength(1))
    expect(db.saved[0]).toMatchObject({ user_id: 'u1', reminder: true, reminder_hour: 20 })
  })

  it('turning the reminder off hides the hours and saves', async () => {
    render(<NotificationsModal role="student" userId="u1" onClose={() => {}} />)
    const reminder = screen.getAllByRole('switch').at(-1)!
    fireEvent.click(reminder)
    await waitFor(() => expect(db.saved).toHaveLength(1))
    expect(db.saved[0]).toMatchObject({ reminder: false })
    expect(screen.queryByRole('radio', { name: '18:00' })).toBeNull()
  })

  it('teacher: only new recordings', () => {
    render(<NotificationsModal role="teacher" userId="t1" onClose={() => {}} />)
    expect(screen.getByText('Nová nahrávka')).toBeInTheDocument()
    expect(screen.queryByText('Připomínka cvičení')).toBeNull()
  })

  it('says so when the browser has no push', () => {
    // jsdom has no service worker.
    render(<NotificationsModal role="student" userId="u1" onClose={() => {}} />)
    expect(screen.getByText(/neumí/)).toBeInTheDocument()
  })
})

describe('base64UrlToBytes', () => {
  it('decodes the URL-safe alphabet without padding', () => {
    expect([...base64UrlToBytes('-_8')]).toEqual([0xfb, 0xff])
    expect([...base64UrlToBytes('AQID')]).toEqual([1, 2, 3])
  })
})

describe('pushErrorText', () => {
  it('explains the browser push service failure in Czech', () => {
    const err = new DOMException('Registration failed - push service error', 'AbortError')
    expect(pushErrorText(err)).toMatch(/službou pro notifikace/)
    expect(pushErrorText(new Error('boom'))).toBe('boom')
  })
})
