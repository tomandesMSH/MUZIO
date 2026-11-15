import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { FeedbackImagesEditor, type FeedbackImageItem } from './FeedbackImagesEditor'

// jsdom can't decode images; shrinking has its own pure parts tested elsewhere.
vi.mock('../../lib/feedbackImages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/feedbackImages')>()),
  shrinkImage: vi.fn(async (file: Blob) => new Blob([file], { type: 'image/jpeg' })),
}))

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

function Harness({ initial = [] as FeedbackImageItem[] }) {
  const [items, setItems] = useState<FeedbackImageItem[]>(initial)
  return <FeedbackImagesEditor items={items} onChange={setItems} />
}

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' })
function pick(...files: File[]) {
  fireEvent.change(screen.getByTestId('feedback-image-input'), { target: { files } })
}

describe('FeedbackImagesEditor', () => {
  it('adds a picked photo as a thumbnail', async () => {
    render(<Harness />)
    pick(photo('a.jpg'))
    expect(await screen.findByAltText('Obrázek 1')).toBeInTheDocument()
  })

  it('keeps at most 3 pictures and says so', async () => {
    render(<Harness initial={[{ kind: 'saved', path: '7/x.jpg', url: 'https://x' }]} />)
    pick(photo('a.jpg'), photo('b.jpg'), photo('c.jpg'))
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
    expect(screen.getByRole('alert')).toHaveTextContent('nejvýš 3')
    expect(screen.queryByRole('button', { name: /Přidat/ })).not.toBeInTheDocument()
  })

  it('refuses a file that is not a picture', async () => {
    render(<Harness />)
    pick(new File(['%PDF'], 'noty.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tohle není obrázek')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('removes a picture', async () => {
    render(<Harness initial={[{ kind: 'saved', path: '7/x.jpg', url: 'https://x' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Odebrat obrázek 1' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
