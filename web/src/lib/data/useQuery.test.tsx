import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQuery } from './useQuery'

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

function Probe({ fn }: { fn: () => Promise<string> }) {
  const q = useQuery(fn, [])
  return <div>{q.loading ? 'loading' : ''}|{q.data ?? ''}|{q.error ? 'error' : ''}</div>
}

describe('useQuery on coming back to the app', () => {
  it('refreshes quietly after 30 s away, keeping the old data meanwhile', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    let n = 0
    let release: () => void = () => {}
    const fn = vi.fn(() => {
      n++
      if (n === 1) return Promise.resolve('first')
      return new Promise<string>((resolve) => (release = () => resolve('second')))
    })
    render(<Probe fn={fn} />)
    await screen.findByText('|first|')

    setVisibility('hidden')
    vi.setSystemTime(Date.now() + 10_000)
    setVisibility('visible')
    expect(fn).toHaveBeenCalledTimes(1) // only 10 s away

    setVisibility('hidden')
    vi.setSystemTime(Date.now() + 60_000)
    act(() => setVisibility('visible'))
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2))
    expect(screen.getByText('|first|')).toBeInTheDocument() // no "loading" flash
    act(() => release())
    await screen.findByText('|second|')
    vi.useRealTimers()
  })
})
