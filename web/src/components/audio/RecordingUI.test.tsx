import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const trim = vi.hoisted(() => ({ result: undefined as unknown }))
vi.mock('../../lib/audio/trim', () => ({ trimSilence: async () => trim.result }))

URL.createObjectURL = vi.fn(() => 'blob:take')
URL.revokeObjectURL = vi.fn()

const finished = () => {
  rec.state = { status: 'stopped', elapsedSeconds: 42, blob: new Blob(['x']), levels: [], error: undefined }
}

describe('RecordingUI', () => {
  beforeEach(() => {
    rec.state = { status: 'idle', elapsedSeconds: 0, blob: undefined, levels: [], error: undefined }
    rec.reset.mockClear()
    trim.result = undefined
  })

  it('does not send by itself: the finished take is played back first', async () => {
    finished()
    const onSend = vi.fn()
    render(<RecordingUI onSend={onSend} />)
    expect(await screen.findByTestId('take-preview')).toHaveAttribute('src', 'blob:take')
    expect(screen.getByText('00:42')).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends on "Odeslat" and clears the take once it went through', async () => {
    finished()
    const onSend = vi.fn(async () => true)
    render(<RecordingUI onSend={onSend} />)
    fireEvent.change(screen.getByLabelText('Vzkaz pro učitele (nepovinné)'), { target: { value: 'takt 8' } })
    await screen.findByTestId('take-preview')
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(onSend).toHaveBeenCalledWith(rec.state.blob, 42, 'takt 8')
    await waitFor(() => expect(rec.reset).toHaveBeenCalled())
  })

  it('sends the take without the silence, or whole when asked', async () => {
    finished()
    const short = new Blob(['y'])
    trim.result = { blob: short, cutStart: 2.1, cutEnd: 0.8, duration: 10.3 }
    const onSend = vi.fn(async () => false)
    render(<RecordingUI onSend={onSend} />)
    expect(await screen.findByText(/Ticho uříznuto: 2,1 s na začátku a 0,8 s na konci/)).toBeInTheDocument()
    expect(screen.getByText('00:10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(onSend).toHaveBeenLastCalledWith(short, 10, '')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Odeslat' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Ponechat celou' }))
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(onSend).toHaveBeenLastCalledWith(rec.state.blob, 42, '')
  })

  it('keeps the take when sending failed, so it can be sent again', async () => {
    finished()
    render(<RecordingUI onSend={async () => false} />)
    await screen.findByTestId('take-preview')
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

  it('counts 3-2-1 before recording starts', () => {
    vi.useFakeTimers()
    rec.start.mockClear()
    render(<RecordingUI onSend={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spustit nahrávání' }))
    expect(screen.getByText('3')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('2')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(rec.start).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1000))
    expect(rec.start).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('the countdown can be cancelled', () => {
    vi.useFakeTimers()
    rec.start.mockClear()
    render(<RecordingUI onSend={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spustit nahrávání' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zrušit odpočet' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(rec.start).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Spustit nahrávání' })).toBeInTheDocument()
    vi.useRealTimers()
  })
})
