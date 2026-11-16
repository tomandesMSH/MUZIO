import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordingUI } from './RecordingUI'

const rec = vi.hoisted(() => ({
  state: {
    status: 'idle' as string,
    elapsedSeconds: 0,
    blob: undefined as Blob | undefined,
    levels: [] as number[],
    error: undefined as string | undefined,
  },
  start: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('../../lib/audio/useMediaRecorder', () => ({
  useMediaRecorder: () => ({ ...rec.state, start: rec.start, stop: rec.stop, reset: rec.reset }),
}))

URL.createObjectURL = vi.fn(() => 'blob:take')
URL.revokeObjectURL = vi.fn()

const finished = () => {
  rec.state = { status: 'stopped', elapsedSeconds: 42, blob: new Blob(['x']), levels: [], error: undefined }
}

describe('RecordingUI', () => {
  beforeEach(() => {
    rec.state = { status: 'idle', elapsedSeconds: 0, blob: undefined, levels: [], error: undefined }
    rec.reset.mockClear()
  })

  it('does not send by itself: the finished take is played back first', () => {
    finished()
    const onSend = vi.fn()
    render(<RecordingUI onSend={onSend} />)
    expect(screen.getByTestId('take-preview')).toHaveAttribute('src', 'blob:take')
    expect(screen.getByText('00:42')).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends on "Odeslat" and clears the take once it went through', async () => {
    finished()
    const onSend = vi.fn(async () => true)
    render(<RecordingUI onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(onSend).toHaveBeenCalledWith(rec.state.blob, 42)
    await waitFor(() => expect(rec.reset).toHaveBeenCalled())
  })

  it('keeps the take when sending failed, so it can be sent again', async () => {
    finished()
    render(<RecordingUI onSend={async () => false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(rec.reset).not.toHaveBeenCalled()
  })

  it('"Nahrát znovu" throws the take away', () => {
    finished()
    render(<RecordingUI onSend={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nahrát znovu' }))
    expect(rec.reset).toHaveBeenCalled()
  })

  it('tells the screen while the take is being reviewed', () => {
    const onReviewingChange = vi.fn()
    const { rerender } = render(<RecordingUI onSend={vi.fn()} onReviewingChange={onReviewingChange} />)
    expect(onReviewingChange).toHaveBeenLastCalledWith(false)
    finished()
    rerender(<RecordingUI onSend={vi.fn()} onReviewingChange={onReviewingChange} />)
    expect(onReviewingChange).toHaveBeenLastCalledWith(true)
  })
})
