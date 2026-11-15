import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AudioFilePicker } from './AudioFilePicker'

beforeAll(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

function pick(file: File) {
  fireEvent.change(screen.getByTestId('audio-file-input'), { target: { files: [file] } })
}

describe('AudioFilePicker', () => {
  it('shows the picked recording and sends it only after Odeslat', () => {
    const onSend = vi.fn()
    render(<AudioFilePicker onSend={onSend} />)
    pick(new File(['abc'], 'Nový záznam.m4a', { type: '' }))

    expect(screen.getByText('Nový záznam.m4a')).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }))
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ extension: 'm4a', contentType: 'audio/mp4' }))
    expect(screen.queryByText('Nový záznam.m4a')).not.toBeInTheDocument()
  })

  it('refuses a file that is not audio', () => {
    const onSend = vi.fn()
    render(<AudioFilePicker onSend={onSend} />)
    pick(new File(['%PDF'], 'noty.pdf', { type: 'application/pdf' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Tohle není zvukový soubor.')
    expect(screen.queryByRole('button', { name: 'Odeslat' })).not.toBeInTheDocument()
  })

  it('goes back to the button on Zrušit', () => {
    render(<AudioFilePicker onSend={() => {}} />)
    pick(new File(['abc'], 'etuda.mp3', { type: 'audio/mpeg' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zrušit' }))
    expect(screen.getByRole('button', { name: /Odeslat nahrávku ze souboru/ })).toBeInTheDocument()
  })
})
