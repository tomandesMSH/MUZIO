import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OwnPieces } from './OwnPieces'
import { validatePieceLink } from '../../lib/data/ownPieces'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const piece = {
  id: 'p1',
  student_id: 's1',
  title: 'Smells Like Teen Spirit – intro',
  link: 'https://www.youtube.com/watch?v=x',
  created_at: '',
  archived_at: null,
}

describe('OwnPieces', () => {
  it('lists pieces; a tap opens the recorder, "Hotovo" hides it', () => {
    const onOpen = vi.fn()
    const onArchive = vi.fn()
    render(<OwnPieces pieces={[piece]} onAdd={vi.fn()} onOpen={onOpen} onArchive={onArchive} />)
    expect(screen.getByText('youtube.com')).toBeInTheDocument()
    fireEvent.click(screen.getByText(piece.title))
    expect(onOpen).toHaveBeenCalledWith(piece)
    fireEvent.click(screen.getByRole('button', { name: 'Hotovo, schovat ze seznamu' }))
    expect(onArchive).toHaveBeenCalledWith(piece)
  })

  it('adds a piece, refusing a link that is not https', async () => {
    const onAdd = vi.fn(async () => {})
    render(<OwnPieces pieces={[]} onAdd={onAdd} onOpen={vi.fn()} onArchive={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Přidat skladbu' }))
    fireEvent.change(screen.getByLabelText('Název skladby'), { target: { value: 'Pro Elišku' } })
    fireEvent.change(screen.getByLabelText('Odkaz (nepovinné)'), { target: { value: 'youtube.com/x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))
    expect(await screen.findByText(/musí začínat https/)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Odkaz (nepovinné)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Pro Elišku', ''))
  })

  it('link check', () => {
    expect(validatePieceLink('')).toBeNull()
    expect(validatePieceLink('https://youtu.be/x')).toBeNull()
    expect(validatePieceLink('http://x')).toMatch(/https/)
  })
})
