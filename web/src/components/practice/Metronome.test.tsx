import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Metronome } from './Metronome'

describe('Metronome', () => {
  beforeEach(() => localStorage.clear())

  it('changes tempo with − / + and remembers it', () => {
    const { unmount } = render(<Metronome />)
    expect(screen.getByText('80')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rychleji' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rychleji' }))
    expect(screen.getByText('82')).toBeInTheDocument()
    unmount()
    render(<Metronome />)
    expect(screen.getByText('82')).toBeInTheDocument()
  })

  it('switches the meter', () => {
    render(<Metronome />)
    fireEvent.click(screen.getByRole('radio', { name: '3/4' }))
    expect(screen.getByRole('radio', { name: '3/4' })).toHaveAttribute('aria-checked', 'true')
    expect(JSON.parse(localStorage.getItem('muzio-metronome') ?? '{}').meterId).toBe('3/4')
  })
})
