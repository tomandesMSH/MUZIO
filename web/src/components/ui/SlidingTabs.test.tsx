import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { SlidingTabs } from './SlidingTabs'

const TABS = [
  { id: 'a', label: 'Nahlášený obsah' },
  { id: 'b', label: 'Nahrávky' },
  { id: 'c', label: 'Uživatelé' },
] as const
type Id = (typeof TABS)[number]['id']

// jsdom has no layout: give every tab a position from its index.
Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
  configurable: true,
  get(this: HTMLElement) {
    return this.getAttribute('role') === 'tab' ? [...(this.parentElement?.querySelectorAll('[role="tab"]') ?? [])].indexOf(this) * 100 : 0
  },
})
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 90 })

function Harness({ onChange = () => {} }: { onChange?: (id: Id) => void }) {
  const [value, setValue] = useState<Id>('a')
  return (
    <SlidingTabs
      tabs={[...TABS]}
      value={value}
      onChange={(id) => {
        setValue(id)
        onChange(id)
      }}
    />
  )
}

describe('SlidingTabs', () => {
  it('puts the solid pill under the selected tab and slides it on click', async () => {
    render(<Harness />)
    expect(await screen.findByTestId('tab-active-pill')).toHaveStyle({ left: '0px', width: '90px' })
    fireEvent.click(screen.getByRole('tab', { name: 'Uživatelé' }))
    expect(screen.getByRole('tab', { name: 'Uživatelé' })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(screen.getByTestId('tab-active-pill')).toHaveStyle({ left: '200px' }))
  })

  it('shows a hover pill under the tab the pointer is on, and hides it when leaving', async () => {
    render(<Harness />)
    await screen.findByTestId('tab-active-pill')
    expect(screen.queryByTestId('tab-hover-pill')).toBeNull()
    fireEvent.mouseEnter(screen.getByRole('tab', { name: 'Nahrávky' }))
    expect(screen.getByTestId('tab-hover-pill')).toHaveStyle({ left: '100px' })
    fireEvent.mouseLeave(screen.getByRole('tablist'))
    expect(screen.queryByTestId('tab-hover-pill')).toBeNull()
  })

  it('moves with the arrow keys', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Nahlášený obsah' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('c')
  })
})
