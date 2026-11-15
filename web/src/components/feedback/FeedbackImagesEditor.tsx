import { useEffect, useRef, useState } from 'react'
import {
  FEEDBACK_IMAGE_ACCEPT,
  MAX_FEEDBACK_IMAGES,
  shrinkImage,
  validateImageFile,
} from '../../lib/feedbackImages'

// One picture in the grading form: already saved (a storage path) or newly
// added (a shrunk JPEG, uploaded when the grade is sent).
export type FeedbackImageItem =
  | { kind: 'saved'; path: string; url?: string }
  | { kind: 'new'; key: string; image: Blob; previewUrl: string }

interface FeedbackImagesEditorProps {
  items: FeedbackImageItem[]
  onChange: (items: FeedbackImageItem[]) => void
}

export function FeedbackImagesEditor({ items, onChange }: FeedbackImagesEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const [working, setWorking] = useState(false)

  // Free the previews of new pictures when the form closes.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(
    () => () => {
      for (const item of itemsRef.current) if (item.kind === 'new') URL.revokeObjectURL(item.previewUrl)
    },
    [],
  )

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setError(undefined)
    const room = MAX_FEEDBACK_IMAGES - items.length
    if (files.length > room) setError(`Obrázky můžou být nejvýš ${MAX_FEEDBACK_IMAGES}.`)

    setWorking(true)
    const added: FeedbackImageItem[] = []
    for (const file of files.slice(0, room)) {
      const problem = validateImageFile(file)
      if (problem) {
        setError(problem)
        continue
      }
      try {
        const image = await shrinkImage(file)
        added.push({ kind: 'new', key: crypto.randomUUID(), image, previewUrl: URL.createObjectURL(image) })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Obrázek se nepodařilo zpracovat.')
      }
    }
    setWorking(false)
    if (added.length > 0) onChange([...items, ...added])
  }

  function remove(index: number) {
    const item = items[index]
    if (item.kind === 'new') URL.revokeObjectURL(item.previewUrl)
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="text-sm font-heading font-semibold mb-1.5 flex items-center gap-1.5">
        <span aria-hidden>🖼️</span> Obrázky <span className="font-body font-normal text-text-muted text-xs">(nejvýš {MAX_FEEDBACK_IMAGES}, nepovinné)</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {items.map((item, index) => {
          const src = item.kind === 'new' ? item.previewUrl : item.url
          return (
            <div key={item.kind === 'new' ? item.key : item.path} className="relative w-20 h-20">
              {src ? (
                <img src={src} alt={`Obrázek ${index + 1}`} className="w-20 h-20 object-cover rounded-xl shadow-clay-sm" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-bg-card-alt" />
              )}
              <button
                type="button"
                aria-label={`Odebrat obrázek ${index + 1}`}
                onClick={() => remove(index)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-cream text-xs flex items-center justify-center shadow-clay-sm"
              >
                ✕
              </button>
            </div>
          )
        })}
        {items.length < MAX_FEEDBACK_IMAGES && (
          <button
            type="button"
            disabled={working}
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border text-text-muted text-xs flex flex-col items-center justify-center gap-0.5 disabled:opacity-40"
          >
            <span className="text-xl leading-none">+</span>
            {working ? 'Zpracovávám…' : 'Přidat'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={FEEDBACK_IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={handleFiles}
        data-testid="feedback-image-input"
      />
      {error && (
        <p role="alert" className="text-sm text-coral-dark mt-1.5">
          {error}
        </p>
      )}
    </div>
  )
}
