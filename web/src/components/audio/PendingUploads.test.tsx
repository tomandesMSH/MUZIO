import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PendingUploads } from './PendingUploads'
import { listPendingUploads, savePendingUpload } from '../../lib/pendingUploads'

const store = vi.hoisted(() => ({
  items: [] as { id: string; userId: string; blob: Blob; durationSeconds: number | null; lessonTitle?: string; createdAt: string }[],
}))
const submit = vi.hoisted(() => ({ fn: vi.fn() }))

vi.mock('../../lib/pendingUploads', () => ({
  listPendingUploads: vi.fn(async (userId: string) => store.items.filter((i) => i.userId === userId)),
  deletePendingUpload: vi.fn(async (id: string) => {
    store.items = store.items.filter((i) => i.id !== id)
  }),
  savePendingUpload: vi.fn(async () => true),
}))
vi.mock('../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../lib/submitRecording', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/submitRecording')>()),
  submitRecording: (...args: unknown[]) => submit.fn(...args),
}))

URL.createObjectURL = vi.fn(() => 'blob:x')
URL.revokeObjectURL = vi.fn()

const item = { id: 'p1', userId: 'u1', blob: new Blob(['a']), durationSeconds: 30, lessonTitle: 'Stupnice C dur', createdAt: '2026-11-16T10:00:00Z' }

describe('PendingUploads', () => {
  beforeEach(() => {
    store.items = [item]
    submit.fn.mockReset()
  })

  it('shows nothing when everything was sent', async () => {
    store.items = []
    const { container } = render(<PendingUploads userId="u1" onSent={vi.fn()} onMessage={vi.fn()} />)
    await waitFor(() => expect(listPendingUploads).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('sends a kept recording again and removes it', async () => {
    submit.fn.mockResolvedValue({ session: null })
    const onSent = vi.fn()
    const onMessage = vi.fn()
    render(<PendingUploads userId="u1" onSent={onSent} onMessage={onMessage} />)
    expect(await screen.findByText('Stupnice C dur')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat znovu' }))
    await waitFor(() => expect(onSent).toHaveBeenCalled())
    expect(submit.fn).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', userId: 'u1' }))
    await waitFor(() => expect(screen.queryByText('Stupnice C dur')).toBeNull())
    expect(onMessage).toHaveBeenCalledWith('Nahrávka odeslána ke kontrole')
  })

  it('keeps it when sending fails again, remembering an upload that got through', async () => {
    const { SubmitError } = await import('../../lib/submitRecording')
    submit.fn.mockRejectedValue(new SubmitError(new Error('timeout'), 'https://x/up.webm'))
    const onMessage = vi.fn()
    render(<PendingUploads userId="u1" onSent={vi.fn()} onMessage={onMessage} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Odeslat znovu' }))
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith('timeout'))
    expect(savePendingUpload).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', audioUrl: 'https://x/up.webm' }))
    expect(screen.getByText('Stupnice C dur')).toBeInTheDocument()
  })

  it('throwing away asks first', async () => {
    render(<PendingUploads userId="u1" onSent={vi.fn()} onMessage={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Zahodit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Opravdu zahodit' }))
    await waitFor(() => expect(screen.queryByText('Stupnice C dur')).toBeNull())
  })
})
