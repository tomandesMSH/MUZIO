import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickPhrases } from './QuickPhrases'
import { appendPhrase } from '../../lib/data/commentSnippets'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const props = { onInsert: vi.fn(), onSave: vi.fn(), onDelete: vi.fn() }

describe('QuickPhrases', () => {
  it('offers defaults until the teacher has their own', () => {
    render(<QuickPhrases kind="improve" saved={[]} current="" {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pozor na rytmus' }))
    expect(props.onInsert).toHaveBeenCalledWith('Pozor na rytmus')
    expect(screen.queryByRole('button', { name: 'Upravit' })).toBeNull()
  })

  it("shows the teacher's own phrases for that field only", () => {
    const saved = [
      { id: '1', kind: 'good' as const, text: 'Bravo' },
      { id: '2', kind: 'improve' as const, text: 'Víc legata' },
    ]
    render(<QuickPhrases kind="good" saved={saved} current="" {...props} />)
    expect(screen.getByRole('button', { name: 'Bravo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Víc legata' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Krásný přednes' })).toBeNull()
  })

  it('saves what is in the field, unless it is saved already', () => {
    const saved = [{ id: '1', kind: 'good' as const, text: 'Bravo' }]
    const { rerender } = render(<QuickPhrases kind="good" saved={saved} current="  Hezký tón " {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Uložit jako rychlou větu' }))
    expect(props.onSave).toHaveBeenCalledWith('Hezký tón')
    rerender(<QuickPhrases kind="good" saved={saved} current="Bravo" {...props} />)
    expect(screen.queryByRole('button', { name: '+ Uložit jako rychlou větu' })).toBeNull()
  })

  it('deletes in edit mode', () => {
    const saved = [{ id: '1', kind: 'good' as const, text: 'Bravo' }]
    render(<QuickPhrases kind="good" saved={saved} current="" {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Upravit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Smazat větu Bravo' }))
    expect(props.onDelete).toHaveBeenCalledWith(saved[0])
  })
})

describe('appendPhrase', () => {
  it('starts a new sentence', () => {
    expect(appendPhrase('', 'Bravo')).toBe('Bravo')
    expect(appendPhrase('Hezky', 'Bravo')).toBe('Hezky. Bravo')
    expect(appendPhrase('Hezky! ', 'Bravo')).toBe('Hezky! Bravo')
  })
})
