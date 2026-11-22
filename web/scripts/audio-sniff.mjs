// What an audio file really is, from its first bytes - the in-app recorder
// used to store every take as ".wav" (audio/wav) whatever the browser had
// recorded. Used by fix-audio-types.mjs; tested in audio-sniff.test.mjs.

const FORMATS = {
  webm: { extension: 'webm', contentType: 'audio/webm' },
  mp4: { extension: 'm4a', contentType: 'audio/mp4' },
  ogg: { extension: 'ogg', contentType: 'audio/ogg' },
  wav: { extension: 'wav', contentType: 'audio/wav' },
  mp3: { extension: 'mp3', contentType: 'audio/mpeg' },
}

// `bytes`: at least the first 12 bytes of the file. Undefined = unknown.
export function sniffAudio(bytes) {
  const b = Array.from(bytes.slice(0, 12))
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to))
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return FORMATS.webm
  if (ascii(4, 8) === 'ftyp') return FORMATS.mp4
  if (ascii(0, 4) === 'OggS') return FORMATS.ogg
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return FORMATS.wav
  if (ascii(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return FORMATS.mp3
  return undefined
}

// "<user>/<time>.wav" -> "<user>/<time>.webm"
export function renamedPath(path, extension) {
  return path.replace(/\.wav$/i, `.${extension}`)
}
