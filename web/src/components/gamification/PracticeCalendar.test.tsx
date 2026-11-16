import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PracticeCalendar } from './PracticeCalendar'

const today = new Date(2026, 10, 17) // Tuesday
const logs = [
  { created_at: new Date(2026, 10, 16, 15).toISOString(), duration_seconds: 300 },
  { created_at: new Date(2026, 10, 16, 18).toISOString(), duration_seconds: 420 },
]

const cell = (container: HTMLElement, key: string) => container.querySelector(`[data-day="${key}"]`) as HTMLElement

describe('PracticeCalendar', () => {
  it('shows the day when pointed at, like GitHub', () => {
    const { container } = render(<PracticeCalendar logs={logs} today={today} />)
    fireEvent.pointerMove(cell(container, '2026-11-16'), { pointerType: 'mouse' })
    expect(screen.getByRole('tooltip')).toHaveTextContent('2 nahrávky · 12 min')
    expect(screen.getByRole('tooltip')).toHaveTextContent('pondělí 16. listopadu')
    fireEvent.pointerLeave(cell(container, '2026-11-16').closest('[role=img]')!, { pointerType: 'mouse' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('on a phone a tap shows it and a tap elsewhere hides it', () => {
    const { container } = render(<PracticeCalendar logs={logs} today={today} />)
    fireEvent.pointerDown(cell(container, '2026-11-15'), { pointerType: 'touch' })
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bez cvičení')
    fireEvent.pointerDown(document.body, { pointerType: 'touch' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('days to come show nothing', () => {
    const { container } = render(<PracticeCalendar logs={logs} today={today} />)
    fireEvent.pointerDown(cell(container, '2026-11-20'), { pointerType: 'touch' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
