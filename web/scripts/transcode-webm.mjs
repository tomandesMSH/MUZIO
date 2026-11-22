#!/usr/bin/env node
// One-off: turns recordings and voice comments stored as WebM (recorded in
// Chrome / Firefox / Android before the recorder preferred MP4) into M4A
// (AAC), which every browser plays - older Safari doesn't play WebM at all.
// Each file is converted with ffmpeg on this computer, stored next to the
// old one, the recording is pointed at it, and only then the WebM is removed.
//
// Needs ffmpeg (Windows: `winget install Gyan.FFmpeg`, then a new terminal).
//
// PowerShell, in web/:
//   $env:SUPABASE_URL = "https://<ref>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_..."
//   node scripts/transcode-webm.mjs            # only reports what it would do
//   node scripts/transcode-webm.mjs --apply    # does it
// FFMPEG=<path to ffmpeg.exe> if it isn't on the PATH.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const apply = process.argv.includes('--apply')
if (!url || !key) {
  console.error('Chybí SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY (viz začátek skriptu).')
  process.exit(1)
}
try {
  execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' })
} catch {
  console.error('Nenašel jsem ffmpeg. Nainstaluj ho (winget install Gyan.FFmpeg), otevři nový terminál, nebo nastav FFMPEG=<cesta>.')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })
const work = mkdtempSync(join(tmpdir(), 'muzio-webm-'))

const RECORDINGS = 'recordings'
const VOICE = 'feedback-audio'

async function rows(column) {
  const all = []
  for (let page = 0; ; page++) {
    const { data, error } = await sb
      .from('practice_logs')
      .select(`id, ${column}`)
      .ilike(column, '%.webm')
      .order('id')
      .range(page * 1000, page * 1000 + 999)
    if (error) throw error
    all.push(...data)
    if (data.length < 1000) return all
  }
}

function recordingPath(audioUrl) {
  const marker = `/${RECORDINGS}/`
  const i = audioUrl.indexOf(marker)
  return i === -1 ? undefined : decodeURIComponent(audioUrl.slice(i + marker.length))
}

async function convert({ bucket, path, save }) {
  if (!apply) return 'would-convert'
  const { data: file, error } = await sb.storage.from(bucket).download(path)
  if (error) return `missing: ${error.message}`
  const input = join(work, 'in.webm')
  const output = join(work, 'out.m4a')
  writeFileSync(input, new Uint8Array(await file.arrayBuffer()))
  try {
    // 64 kbps AAC, like the app's own recorder; +faststart so it starts
    // playing before it has fully downloaded.
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', input, '-vn', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', output])
  } catch (err) {
    return `ffmpeg failed: ${err.message}`
  }
  const newPath = path.replace(/\.webm$/i, '.m4a')
  const up = await sb.storage.from(bucket).upload(newPath, readFileSync(output), { contentType: 'audio/mp4', upsert: true })
  if (up.error) return `upload failed: ${up.error.message}`
  const saved = await save(newPath)
  if (saved.error) {
    await sb.storage.from(bucket).remove([newPath])
    return `save failed: ${saved.error.message}`
  }
  await sb.storage.from(bucket).remove([path])
  return 'converted'
}

const tally = {}
const note = (what, result) => {
  tally[`${what}: ${result}`] = (tally[`${what}: ${result}`] ?? 0) + 1
}

try {
  const recordings = await rows('audio_url')
  console.log(`Nahrávky ve WebM: ${recordings.length}`)
  for (const row of recordings) {
    const path = recordingPath(row.audio_url)
    if (!path) {
      note('nahrávka', 'unknown-url')
      continue
    }
    note(
      'nahrávka',
      await convert({
        bucket: RECORDINGS,
        path,
        save: (newPath) =>
          sb
            .from('practice_logs')
            .update({ audio_url: sb.storage.from(RECORDINGS).getPublicUrl(newPath).data.publicUrl })
            .eq('id', row.id)
            .eq('audio_url', row.audio_url),
      }),
    )
    process.stdout.write('.')
  }

  const voices = await rows('feedback_audio')
  console.log(`\nHlasové komentáře ve WebM: ${voices.length}`)
  for (const row of voices) {
    note(
      'komentář',
      await convert({
        bucket: VOICE,
        path: row.feedback_audio,
        save: (newPath) =>
          sb.from('practice_logs').update({ feedback_audio: newPath }).eq('id', row.id).eq('feedback_audio', row.feedback_audio),
      }),
    )
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

console.log('')
for (const [k, n] of Object.entries(tally).sort()) console.log(`${String(n).padStart(5)}  ${k}`)
if (!apply) console.log('\nNic se nezměnilo. Pro převod spusť znovu s --apply.')
