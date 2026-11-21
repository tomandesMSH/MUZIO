import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Recording } from './Recording'
import { savePendingUpload } from '../../lib/pendingUploads'

const submit = vi.hoisted(() => ({ fn: vi.fn() }))
const stats = vi.hoisted(() => ({ fail: false }))
const take = new Blob(['take'])

vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/AuthProvider', () => ({
  useAuth: () => ({ profile: { id: 'u1', xp: 0, stars: 0, streak: 1 }, refreshProfile: vi.fn() }),
}))
vi.mock('../../lib/submitRecording', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/submitRecording')>()),
  submitRecording: (...args: unknown[]) => submit.fn(...args),
}))
vi.mock('../../lib/pendingUploads', () => ({
  savePendingUpload: vi.fn(async () => true),
  deletePendingUpload: vi.fn(async () => {}),
}))
vi.mock('../../lib/data/practiceLogs', () => ({
  fetchOwnLogsCount: async () => {
    if (stats.fail) throw new Error('network')
    return 1
  },
  fetchWeeklyStats: async () => ({ dateKeys: [], weeklyCount: 1 }),
}))
vi.mock('../../lib/sounds', () => ({ playSent: vi.fn() }))
vi.mock('../../components/practice/Metronome', () => ({ Metronome: () => null }))
vi.mock('../../components/practice/Tuner', () => ({ Tuner: () => null }))
vi.mock('../../components/audio/AudioFilePicker', () => ({ AudioFilePicker: () => null }))
// A stand-in recorder: "Odeslat" sends the same take every time it's pressed.
vi.mock('../../components/audio/RecordingUI', () => ({
  RecordingUI: ({ onSend }: { onSend: (blob: Blob, seconds: number, note?: string) => Promise<boolean> }) => (
    <button onClick={() => void onSend(take, 30)}>Odeslat</button>
  ),
}))

function renderScreen() {
  render(
    <MemoryRouter>
      <Recording />
    </MemoryRouter>,
  )
}

describe('Recording', () => {
  beforeEach(() => {
    submit.fn.mockReset()
    vi.mocked(savePendingUpload).mockClear()
    stats.fail = false
  })

  it('a sent recording stays sent even when the celebration fails', async () => {
    submit.fn.mockResolvedValue({ session: null })
    stats.fail = true
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(await screen.findByText('Nahrávka už letí k učiteli')).toBeInTheDocument()
    await waitFor(() => expect(submit.fn).toHaveBeenCalledTimes(1))
    expect(savePendingUpload).not.toHaveBeenCalled()
    expect(screen.queryByText(/neodeslala/)).toBeNull()
  })

  it('two quick taps send the take once', async () => {
    let resolve: (v: unknown) => void = () => {}
    submit.fn.mockImplementation(() => new Promise((r) => (resolve = r)))
    renderScreen()
    const button = screen.getByRole('button', { name: 'Odeslat' })
    fireEvent.click(button)
    fireEvent.click(button)
    resolve({ session: null })
    expect(await screen.findByText('Nahrávka už letí k učiteli')).toBeInTheDocument()
    expect(submit.fn).toHaveBeenCalledTimes(1)
  })

  it('a failed send is kept in the phone', async () => {
    submit.fn.mockRejectedValue(new Error('offline'))
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(await screen.findByText(/neodeslala/)).toBeInTheDocument()
    expect(savePendingUpload).toHaveBeenCalledTimes(1)
  })
})
