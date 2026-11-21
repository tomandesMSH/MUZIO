import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LessonCard } from './LessonCard'

describe('LessonCard reward', () => {
  it('shows the stars for completing it, nothing without a reward', () => {
    const { rerender } = render(
      <LessonCard icon="lessons" title="Domácí koncert" meta="" badge={{ label: 'Čeká', tone: 'pending' }} reward={2} />,
    )
    expect(screen.getByText(/Odměna: 2 hvězdy/)).toBeInTheDocument()
    rerender(<LessonCard icon="lessons" title="Domácí koncert" meta="" badge={{ label: 'Čeká', tone: 'pending' }} />)
    expect(screen.queryByText(/Odměna/)).toBeNull()
  })
})
