// Pictures the teacher attaches to a grade (issue #4, migration 0026): a photo
// of the score with the tricky bar circled, a fingering sketch.

export const FEEDBACK_IMAGES_BUCKET = 'feedback-images'
export const MAX_FEEDBACK_IMAGES = 3
// The photo as it comes from the phone; it's shrunk before upload anyway.
export const MAX_SOURCE_IMAGE_MB = 25
// Longest side after shrinking - plenty to read a score, ~200-400 kB as JPEG.
export const MAX_IMAGE_SIDE = 1600

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp']

export const FEEDBACK_IMAGE_ACCEPT = ['image/*', ...IMAGE_EXTENSIONS.map((e) => `.${e}`)].join(',')

// Null when the picture can be used, otherwise why not (shown to the teacher).
export function validateImageFile(file: { name: string; type: string; size: number }): string | null {
  const dot = file.name.lastIndexOf('.')
  const extension = dot === -1 ? '' : file.name.slice(dot + 1).toLowerCase()
  if (!file.type.startsWith('image/') && !IMAGE_EXTENSIONS.includes(extension)) {
    return 'Tohle není obrázek. Vyber fotku nebo obrázek (JPG, PNG…).'
  }
  if (file.size === 0) return 'Soubor je prázdný.'
  if (file.size > MAX_SOURCE_IMAGE_MB * 1024 * 1024) {
    return `Obrázek je moc velký, nejvýš ${MAX_SOURCE_IMAGE_MB} MB.`
  }
  return null
}

// Size that fits within maxSide, keeping the aspect ratio; never enlarges.
export function fitWithin(width: number, height: number, maxSide = MAX_IMAGE_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// Shrinks a photo to a JPEG of at most MAX_IMAGE_SIDE px. Decoding uses the
// browser, so a format it can't open (HEIC outside Safari) is rejected with a
// message instead of uploading something the pupil couldn't see.
export async function shrinkImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Tenhle obrázek neumím otevřít. Zkus ho poslat jako JPG nebo PNG.')
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Obrázek se nepodařilo zpracovat.')
  // White behind transparent PNGs, which JPEG can't keep.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Obrázek se nepodařilo zpracovat.'))), 'image/jpeg', 0.85),
  )
}

// Storage key: <practice log id>/<random>.jpg - the folder is what the
// storage policies check (migration 0026).
export function feedbackImagePath(logId: string | number, id: string = crypto.randomUUID()): string {
  return `${logId}/${id}.jpg`
}
