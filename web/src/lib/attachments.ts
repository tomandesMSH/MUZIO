// Assignment attachments: a score the teacher adds to an assignment. MIDI /
// MusicXML is for the Keyboard Utils desktop app; a PDF or a photo of the
// score just opens on the pupil's phone.

export const ASSIGNMENT_FILES_BUCKET = 'assignment-files'

// Same limit as the bucket's file_size_limit (migration 0023).
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

const SCORE_APP_EXTENSIONS = ['.mid', '.midi', '.musicxml', '.mxl', '.xml']
const DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

export const ATTACHMENT_EXTENSIONS = [...SCORE_APP_EXTENSIONS, ...DOCUMENT_EXTENSIONS] as const

// For <input type="file" accept=...>.
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.join(',')

export const KEYBOARD_UTILS_URL = 'https://github.com/tomandesMSH/Keyboard-Utils'
export const KEYBOARD_UTILS_DOWNLOAD_URL = 'https://github.com/tomandesMSH/Keyboard-Utils/releases/latest'

// "Otevřít v Keyboard Utils": a link the app (1.1.0+) registers itself for. It
// downloads the signed URL (Supabase storage only, valid a few minutes) and
// opens the score.
export function keyboardUtilsOpenLink(signedUrl: string, fileName: string): string {
  return `keyboardutils://open?url=${encodeURIComponent(signedUrl)}&name=${encodeURIComponent(fileName)}`
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

// Null when the file can be attached, otherwise why not (shown to the teacher).
export function validateAttachment(file: { name: string; size: number }): string | null {
  if (!(ATTACHMENT_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return 'Přiložit jde noty v PDF, fotku (JPG, PNG), MIDI (.mid) nebo MusicXML (.musicxml, .mxl, .xml).'
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'Soubor je moc velký - nejvýš 5 MB.'
  }
  if (file.size === 0) {
    return 'Soubor je prázdný.'
  }
  return null
}

// Storage key for an assignment's file: <assignment id>/<safe file name>.
// Storage keys are kept to plain ASCII; the original name (diacritics and
// all) is stored separately and used for the download.
export function attachmentPath(assignmentId: string, fileName: string): string {
  const extension = extensionOf(fileName)
  const base = fileName.slice(0, fileName.length - extension.length)
  const safeBase =
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'noty'
  return `${assignmentId}/${safeBase}${extension}`
}

// 'score-app' = for Keyboard Utils, 'document' = a PDF or picture to look at.
export function attachmentKind(fileName: string): 'score-app' | 'document' {
  return DOCUMENT_EXTENSIONS.includes(extensionOf(fileName)) ? 'document' : 'score-app'
}

export function attachmentContentType(fileName: string): string {
  switch (extensionOf(fileName)) {
    case '.pdf':
      return 'application/pdf'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.mid':
    case '.midi':
      return 'audio/midi'
    case '.mxl':
      return 'application/vnd.recordare.musicxml'
    default:
      return 'application/vnd.recordare.musicxml+xml'
  }
}
