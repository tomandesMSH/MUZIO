import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('draws placeholder rows and tells screen readers it is loading', () => {
    const { container } = render(<Skeleton rows={4} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Načítám…')).toHaveClass('sr-only')
    expect(container.querySelectorAll('[aria-hidden]')).toHaveLength(4)
  })
})
