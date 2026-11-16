import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Chevron, Collapse } from './Collapse'

describe('Collapse', () => {
  it('keeps closed content mounted but out of reach (inert), so closing can animate', () => {
    const { rerender } = render(
      <Collapse open={false} id="x">
        <button>Uvnitř</button>
      </Collapse>,
    )
    const region = document.getElementById('x')!
    expect(region).toHaveAttribute('inert')
    expect(region.className).toContain('grid-rows-[0fr]')

    rerender(
      <Collapse open id="x">
        <button>Uvnitř</button>
      </Collapse>,
    )
    expect(region).not.toHaveAttribute('inert')
    expect(region.className).toContain('grid-rows-[1fr]')
    expect(screen.getByRole('button', { name: 'Uvnitř' })).toBeInTheDocument()
  })

  it('turns the chevron when open', () => {
    const { container, rerender } = render(<Chevron open={false} />)
    expect(container.firstElementChild?.className).not.toContain('rotate-180')
    rerender(<Chevron open />)
    expect(container.firstElementChild?.className).toContain('rotate-180')
  })
})
