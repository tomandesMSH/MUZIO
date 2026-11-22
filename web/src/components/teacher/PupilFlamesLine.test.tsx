import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PupilFlamesLine } from './PupilFlamesLine'

describe('PupilFlamesLine', () => {
  it('flames in proper Czech, with the world phase when a world is picked', () => {
    const { rerender } = render(<PupilFlamesLine flames={1} />)
    expect(screen.getByText('1 plamínek')).toBeInTheDocument()
    rerender(<PupilFlamesLine flames={3} />)
    expect(screen.getByText('3 plamínky')).toBeInTheDocument()
    rerender(<PupilFlamesLine flames={15} world="hrad" />)
    expect(screen.getByText(/15 plamínků · Hudební hrad, fáze 2 ze 4/)).toBeInTheDocument()
  })

  it('shows a placeholder while loading', () => {
    render(<PupilFlamesLine flames={undefined} />)
    expect(screen.getByText('…')).toBeInTheDocument()
  })
})
