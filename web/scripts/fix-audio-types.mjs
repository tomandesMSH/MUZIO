#!/usr/bin/env node
// One-off: older in-app recordings (and the teacher's voice comments) were
// stored as ".wav" / audio/wav although the browser recorded WebM (Chrome,
// Firefox, Android) or MP4 (Safari). Safari won't play a file labelled
// wrongly. This finds every such file, works out what it really is from its
// first bytes, stores it again under the right extension and type, points
// the recording at the new file, and only then removes the old one.
//
// Nothing is re-encoded: a WebM take plays in Safari 17.4+ (iOS 17.4+) once
// it's labelled right; older Safari doesn't play WebM at all.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> \
//     node scripts/fix-audio-types.mjs            # only reports what it would do
//   ... node scripts/fix-audio-types.mjs --apply  # does it
//
// The service role key is in Supabase -> Project Settings -> API. It stays
// on this computer; don't commit it.
import { createClient } from '@supabase/supabase-js'
import { renamedPath, sniffAudio } from './audio-sniff.mjs'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const apply = process.argv.includes('--apply')
if (!url || !key) {
  console.error('Chybí SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY (viz začátek skriptu).')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

const RECORDINGS = 'recordings'
const VOICE = 'feedback-audio'

async function allRows(column) {
  const rows = []
  for (let page = 0; ; page++) {
    const { data, error } = await sb
      .from('practice_logs')
      .select(`id, ${column}`)
      .ilike(column, '%.wav')
      .order('id')
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

// Storage path of a public recording URL ".../object/public/recordings/<path>".
function recordingPath(audioUrl) {
  const marker = `/${RECORDINGS}/`
  const i = audioUrl.indexOf(marker)
  return i === -1 ? undefined : decodeURIComponent(audioUrl.slice(i + marker.length))
}

async function fixOne({ bucket, path, save }) {
  const { data: file, error } = await sb.storage.from(bucket).download(path)
  if (error) return { status: 'missing', note: error.message }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const format = sniffAudio(bytes)
  if (!format) return { status: 'unknown' }
  if (format.extension === 'wav') return { status: 'ok' }
  const newPath = renamedPath(path, format.extension)
  if (!apply) return { status: 'would-fix', format: format.extension }
  const up = await sb.storage.from(bucket).upload(newPath, bytes, { contentType: format.contentType, upsert: true })
  if (up.error) return { status: 'failed', note: up.error.message }
  const saved = await save(newPath)
  if (saved.error) {
    await sb.storage.from(bucket).remove([newPath])
    return { status: 'failed', note: saved.error.message }
  }
  await sb.storage.from(bucket).remove([path])
  return { status: 'fixed', format: format.extension }
}

const tally = {}
const count = (what, result) => {
  const k = `${what}: ${result.status}${result.format ? ` (${result.format})` : ''}`
  tally[k] = (tally[k] ?? 0) + 1
  if (result.note) console.log(`  ${what} ${result.status}: ${result.note}`)
}

const recordings = await allRows('audio_url')
console.log(`Nahrávky s .wav: ${recordings.length}`)
for (const row of recordings) {
  const path = recordingPath(row.audio_url)
  if (!path) {
    count('nahrávka', { status: 'unknown-url' })
    continue
  }
  const result = await fixOne({
    bucket: RECORDINGS,
    path,
    save: (newPath) => {
      const publicUrl = sb.storage.from(RECORDINGS).getPublicUrl(newPath).data.publicUrl
      return sb.from('practice_logs').update({ audio_url: publicUrl }).eq('id', row.id).eq('audio_url', row.audio_url)
    },
  })
  count('nahrávka', result)
}

const voices = await allRows('feedback_audio')
console.log(`Hlasové komentáře s .wav: ${voices.length}`)
for (const row of voices) {
  const result = await fixOne({
    bucket: VOICE,
    path: row.feedback_audio,
    save: (newPath) => sb.from('practice_logs').update({ feedback_audio: newPath }).eq('id', row.id).eq('feedback_audio', row.feedback_audio),
  })
  count('komentář', result)
}

console.log('')
for (const [k, n] of Object.entries(tally).sort()) console.log(`${String(n).padStart(5)}  ${k}`)
if (!apply) console.log('\nNic se nezměnilo. Pro opravu spusť znovu s --apply.')
