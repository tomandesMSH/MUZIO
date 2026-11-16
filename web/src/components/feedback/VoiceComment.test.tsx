import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceCommentEditor } from './VoiceComment'

const rec = vi.hoisted(() => ({
  state: { status: 'idle', elapsedSeconds: 0, blob: undefined as Blob | undefined, error: undefined as string | undefined },
  start: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
}))
vi.mock('../../lib/audio/useMediaRecorder', () => ({
  useMediaRecorder: () => ({ ...rec.state, levels: [], start: rec.start, stop: rec.stop, reset: rec.reset }),
}))
vi.mock('../../lib/data/feedbackAudio', () => ({
  MAX_VOICE_SECONDS: 60,
  fetchFeedbackAudioUrl: vi.fn(async (path: string) => `https://signed/${path}`),
}))
URL.createObjectURL = vi.fn(() => 'blob:voice')
URL.revokeObjectURL = vi.fn()

describe('VoiceCommentEditor', () => {
  beforeEach(() => {
    rec.state = { status: 'idle', elapsedSeconds: 0, blob: undefined, error: undefined }
    rec.start.mockClear()
    rec.reset.mockClear()
  })

  it('starts recording from the button', () => {
    render(<VoiceCommentEditor value={{ kind: 'none' }} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '🎙 Nahrát hlasový komentář' }))
    expect(rec.start).toHaveBeenCalled()
  })

  it('a finished recording becomes the comment', () => {
    const onChange = vi.fn()
    const blob = new Blob(['v'])
    rec.state = { status: 'stopped', elapsedSeconds: 12, blob, error: undefined }
    render(<VoiceCommentEditor value={{ kind: 'none' }} onChange={onChange} />)
    expect(onChange).toHaveBeenCalledWith({ kind: 'new', blob, seconds: 12 })
    expect(rec.reset).toHaveBeenCalled()
  })

  it('a saved comment plays and can be deleted', async () => {
    const onChange = vi.fn()
    render(<VoiceCommentEditor value={{ kind: 'saved', path: '5/a.wav' }} onChange={onChange} />)
    expect(await screen.findByTestId('voice-comment')).toHaveAttribute('src', 'https://signed/5/a.wav')
    fireEvent.click(screen.getByRole('button', { name: 'Smazat komentář' }))
    expect(onChange).toHaveBeenCalledWith({ kind: 'none' })
  })

  it('shows the time while recording, with Stop', () => {
    rec.state = { status: 'recording', elapsedSeconds: 7, blob: undefined, error: undefined }
    render(<VoiceCommentEditor value={{ kind: 'none' }} onChange={vi.fn()} />)
    expect(screen.getByText('Nahrávám 0:07 / 1:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(rec.stop).toHaveBeenCalled()
  })
})
