import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PickerMenu } from './PickerMenu'

const names = ['Adam', 'Bára', 'Cyril', 'Dana', 'Eva', 'Filip', 'Gábina', 'Hynek']
const options = names.map((n) => ({ value: n.toLowerCase(), label: n }))

describe('PickerMenu', () => {
  it('opens a list in the page (not a native select) and picks on click', () => {
    const onPick = vi.fn()
    render(<PickerMenu label="+ Přidat žáka" options={options.slice(0, 3)} onPick={onPick} />)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Přidat žáka/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Bára' }))
    expect(onPick).toHaveBeenCalledWith('bára')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('searches longer lists and picks with the keyboard', () => {
    const onPick = vi.fn()
    render(<PickerMenu label="+ Přidat žáka" options={options} onPick={onPick} searchPlaceholder="Hledat žáka…" />)
    fireEvent.click(screen.getByRole('button', { name: /Přidat žáka/ }))
    const search = screen.getByPlaceholderText('Hledat žáka…')
    fireEvent.change(search, { target: { value: 'fil' } })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Filip'])
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith('filip')
  })

  it('closes on Escape and on a click outside without picking', () => {
    const onPick = vi.fn()
    render(<PickerMenu label="Předat učiteli" options={options.slice(0, 2)} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: /Předat učiteli/ }))
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Předat učiteli/ }))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('says when there is nothing to pick', () => {
    render(<PickerMenu label="+ Přidat žáka" options={[]} onPick={() => {}} emptyText="Všichni žáci už ve třídě jsou." />)
    fireEvent.click(screen.getByRole('button', { name: /Přidat žáka/ }))
    expect(screen.getByText('Všichni žáci už ve třídě jsou.')).toBeInTheDocument()
  })
})
