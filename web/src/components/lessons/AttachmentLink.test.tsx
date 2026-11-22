import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttachmentLink } from './AttachmentLink'

vi.mock('../../lib/data/classrooms', () => ({ fetchAttachmentDownloadUrl: vi.fn(async () => 'https://x/signed') }))

describe('AttachmentLink', () => {
  it('a PDF score opens in the browser, without Keyboard Utils', () => {
    render(<AttachmentLink assignment={{ attachment_path: 'a1/noty.pdf', attachment_name: 'Noty.pdf' }} />)
    expect(screen.getByRole('button', { name: 'Otevřít noty' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stáhnout Noty.pdf' })).toBeInTheDocument()
    expect(screen.queryByText('Otevřít v Keyboard Utils')).toBeNull()
  })

  it('a MIDI file still offers Keyboard Utils', () => {
    render(<AttachmentLink assignment={{ attachment_path: 'a1/skladba.mid', attachment_name: 'Skladba.mid' }} />)
    expect(screen.getByText('Otevřít v Keyboard Utils')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Otevřít noty' })).toBeNull()
  })
})
