// Times in a teacher's comment ("0:42 – tady zrychluješ") that jump the
// recording to that spot.

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export type TextPart = { text: string } | { time: number; label: string }

// m:ss or mm:ss, not part of a longer number (a date, 1:2:3).
const TIME = /(?<![\d:.])(\d{1,2}):([0-5]\d)(?![\d:])/g

export function splitTimestamps(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(TIME)) {
    const at = match.index ?? 0
    if (at > last) parts.push({ text: text.slice(last, at) })
    parts.push({ time: Number(match[1]) * 60 + Number(match[2]), label: match[0] })
    last = at + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

export function hasTimestamps(text: string | null | undefined): boolean {
  return !!text && splitTimestamps(text).some((p) => 'time' in p)
}

// Puts "0:42 " where the cursor is (with a space before it when needed).
export function insertAt(text: string, position: number, insert: string): { text: string; cursor: number } {
  const at = Math.max(0, Math.min(position, text.length))
  const before = text.slice(0, at)
  const lead = before === '' || /\s$/.test(before) ? '' : ' '
  const piece = `${lead}${insert} `
  return { text: before + piece + text.slice(at), cursor: at + piece.length }
}
