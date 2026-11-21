import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BeforeAfter } from './BeforeAfter'
import type { PracticeLog } from '../../lib/data/types'

const log = (id: string, created_at: string, rating: number | null) =>
  ({ id, created_at, audio_url: `https://x/${id}.wav`, assignment_id: 'a1', own_piece_id: null, rating }) as unknown as PracticeLog

describe('BeforeAfter', () => {
  it('shows the first and latest recording of a piece with its name', () => {
    render(
      <BeforeAfter
        logs={[log('1', '2026-10-01T10:00:00Z', 2), log('2', '2026-11-01T10:00:00Z', 5), log('3', '2026-10-15T10:00:00Z', 3)]}
        titleFor={() => 'Stupnice C dur'}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Tvůj pokrok/ }))
    expect(screen.getByText('Stupnice C dur')).toBeInTheDocument()
    expect(screen.getByText('3 nahrávky')).toBeInTheDocument()
    expect(screen.getByText('Poprvé')).toBeInTheDocument()
    expect(screen.getByText('Naposledy')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Hodnocení 2 z 5' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Hodnocení 5 z 5' })).toBeInTheDocument()
  })

  it('renders nothing without anything to compare', () => {
    const { container } = render(<BeforeAfter logs={[log('1', '2026-10-01T10:00:00Z', null)]} titleFor={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
