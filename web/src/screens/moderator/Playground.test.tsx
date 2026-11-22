import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { Playground } from './Playground'

const renderIt = () =>
  render(
    <MemoryRouter>
      <Playground />
    </MemoryRouter>,
  )

describe('Playground', () => {
  afterEach(() => {
    delete document.documentElement.dataset.style
    document.documentElement.classList.remove('dark')
  })

  it('shows the pupil view with every picture of the castle', () => {
    renderIt()
    expect(screen.getByText('Můj svět (nástěnka)')).toBeInTheDocument()
    expect(screen.getByText('Všechny obrázky světa (7)')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/7\. obrázek/))
    expect(screen.getByText(/Plamínky v kole: 26 z 28/)).toBeInTheDocument()
  })

  it('switches to the teacher view and the modern look, and puts the look back when left', () => {
    const { unmount } = renderIt()
    fireEvent.click(screen.getByRole('button', { name: 'Učitel' }))
    expect(screen.getByText('Zamčená karta žáka (mimo moje třídy)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Moderní' }))
    expect(document.documentElement.dataset.style).toBe('modern')
    unmount()
    expect(document.documentElement.dataset.style).toBeUndefined()
  })
})
