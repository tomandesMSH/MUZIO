import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Base44Overview, type Base44Row } from './Base44Overview'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const rows: Base44Row[] = [
  { base44_name: 'stepik1515', flames: 1, stars: 3, badges: 0, claimed: false, muzio_name: null, claimed_at: null },
  { base44_name: 'jsedmerova1', flames: 3, stars: 0, badges: 1, claimed: true, muzio_name: 'Jana Sedmerová', claimed_at: '2026-11-22T10:00:00Z' },
]

describe('Base44Overview', () => {
  it('shows how many moved, and who', async () => {
    render(<Base44Overview rows={rows} />)
    expect(await screen.findByText(/převzato 1 z 2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Migrace z Base44/ }))
    expect(screen.getByText('zatím nepřevzato', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/→ Jana Sedmerová/)).toBeInTheDocument()
    expect(screen.getByText(/odznaky 1/)).toBeInTheDocument()
  })
})
