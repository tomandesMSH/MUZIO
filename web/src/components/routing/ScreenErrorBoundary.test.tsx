import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScreenErrorBoundary } from './ScreenErrorBoundary'
import { isChunkLoadError } from '../../lib/chunkError'

function Broken({ error }: { error: Error }): never {
  throw error
}

describe('ScreenErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('recognises a screen that failed to download', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/Grading-abc.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('x is undefined'))).toBe(false)
  })

  it('offline: explains instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(
      <ScreenErrorBoundary>
        <Broken error={new TypeError('Failed to fetch dynamically imported module')} />
      </ScreenErrorBoundary>,
    )
    expect(screen.getByText('Tuhle stránku teď nejde otevřít')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Načíst znovu' })).toBeInTheDocument()
  })
})
