import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MigrationSection } from './MigrationSection'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../components/teacher/Base44Overview', () => ({
  fetchBase44Overview: async () => [
    { base44_name: 'stepik1515', flames: 1, stars: 3, badges: 0, claimed: false, muzio_name: null, claimed_at: null },
    { base44_name: 'jsedmerova1', flames: 3, stars: 0, badges: 1, claimed: true, muzio_name: 'Jana Sedmerová', claimed_at: '2026-11-22T10:00:00Z' },
  ],
}))

describe('MigrationSection', () => {
  it('lists the Base44 pupils with their status', async () => {
    render(<MigrationSection />)
    expect(await screen.findByText('stepik1515')).toBeInTheDocument()
    expect(screen.getByText('Nemigroval(a)')).toBeInTheDocument()
    expect(screen.getByText('Migroval(a)')).toBeInTheDocument()
    expect(screen.getByText('Jana Sedmerová')).toBeInTheDocument()
    expect(screen.getByText(/z/, { selector: 'p' })).toHaveTextContent('Převzato 1 z 2 žáků z Base44.')
  })
})
