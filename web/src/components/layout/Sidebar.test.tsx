import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'u1' } }) }))

// jsdom has no layout: each nav item sits 50 px below the previous one.
Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
  configurable: true,
  get(this: HTMLElement) {
    const items = [...(this.parentElement?.querySelectorAll(':scope > button') ?? [])]
    return items.indexOf(this) * 50
  },
})
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 44 })

vi.mock('../../lib/data/practiceLogs', () => ({
  countPendingReview: vi.fn(async () => 5),
  countUnseenFeedback: vi.fn(async () => 0),
}))

vi.mock('./navItems', () => ({
  navItemsFor: () => [
    {
      to: '/student',
      label: 'Dashboard',
      icon: 'home',
      badge: { key: 'pending-review', label: 'nahrávek ke kontrole' },
      isActive: (p: string) => p === '/student',
    },
    { to: '/student/lessons', label: 'Lekce', icon: '📋', isActive: (p: string) => p === '/student/lessons' },
    { to: '/student/feedback', label: 'Nahrávky', icon: '🎧', isActive: (p: string) => p === '/student/feedback' },
  ],
}))

describe('Sidebar', () => {
  it('puts the coral pill under the current page and the faint one under the pointer', async () => {
    render(
      <MemoryRouter initialEntries={['/student/lessons']}>
        <Sidebar role="student" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /Lekce/ })).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(screen.getByTestId('nav-active-pill')).toHaveStyle({ top: '50px', height: '44px' }))

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Nahrávky/ }))
    expect(screen.getByTestId('nav-hover-pill')).toHaveStyle({ top: '100px' })
    fireEvent.mouseLeave(screen.getByRole('navigation'))
    expect(screen.queryByTestId('nav-hover-pill')).toBeNull()
  })

  it('slides the coral pill when you go to another page', async () => {
    render(
      <MemoryRouter initialEntries={['/student']}>
        <Sidebar role="student" />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('nav-active-pill')).toHaveStyle({ top: '0px' }))
    fireEvent.click(screen.getByRole('button', { name: /Nahrávky/ }))
    await waitFor(() => expect(screen.getByTestId('nav-active-pill')).toHaveStyle({ top: '100px' }))
  })

  it('a new page (its own sidebar) starts the pill where it was, then slides it', async () => {
    const first = render(
      <MemoryRouter initialEntries={['/student/feedback']}>
        <Sidebar role="student" />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('nav-active-pill')).toHaveStyle({ top: '100px' }))
    first.unmount()

    render(
      <MemoryRouter initialEntries={['/student']}>
        <Sidebar role="student" />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('nav-active-pill')).toHaveStyle({ top: '100px' }))
    await waitFor(() => expect(screen.getByTestId('nav-active-pill')).toHaveStyle({ top: '0px' }))
  })

  it('shows how many recordings wait, on the item that has a badge', async () => {
    render(
      <MemoryRouter initialEntries={['/student']}>
        <Sidebar role="student" />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('status', { name: '5 nahrávek ke kontrole' })).toHaveTextContent('5')
  })
})
