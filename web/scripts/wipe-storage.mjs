#!/usr/bin/env node
// One-off, po scripts/wipe-data.sql: smaže ve Storage soubory, jejichž
// vlastník už v databázi není. Soubory leží ve složce podle toho, komu patří:
//
//   recordings/<id uživatele>/...        -> profiles
//   feedback-audio/<id nahrávky>/...     -> practice_logs
//   feedback-images/<id nahrávky>/...    -> practice_logs
//   assignment-files/<id úkolu>/...      -> assignments
//
// Složky, jejichž id v tabulce chybí, se smažou celé. Soubory ponechaných
// účtů zůstanou.
//
//   $env:SUPABASE_URL = "https://<ref>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<key>"
//   node scripts/wipe-storage.mjs            # jen vypíše, co by smazal
//   node scripts/wipe-storage.mjs --apply    # smaže
//
// Service role klíč je v Supabase -> Project Settings -> API. Necommitovat.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const apply = process.argv.includes('--apply')
if (!url || !key) {
  console.error('Chybí SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY (viz začátek skriptu).')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

const BUCKETS = [
  { bucket: 'recordings', table: 'profiles' },
  { bucket: 'feedback-audio', table: 'practice_logs' },
  { bucket: 'feedback-images', table: 'practice_logs' },
  { bucket: 'assignment-files', table: 'assignments' },
]
const PAGE = 1000

async function ids(table) {
  const out = new Set()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select('id').order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    for (const row of data) out.add(String(row.id))
    if (data.length < PAGE) return out
  }
}

// Všechny soubory pod prefixem (i ve vnořených složkách).
async function listAll(bucket, prefix) {
  const files = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) files.push(...(await listAll(bucket, path)))
      else files.push({ path, bytes: item.metadata?.size ?? 0 })
    }
    if (data.length < PAGE) return files
  }
}

let totalFiles = 0
let totalBytes = 0
for (const { bucket, table } of BUCKETS) {
  const keep = await ids(table)
  const top = []
  let error = null
  for (let offset = 0; ; offset += PAGE) {
    const res = await sb.storage.from(bucket).list('', { limit: PAGE, offset })
    if (res.error) {
      error = res.error
      break
    }
    top.push(...res.data)
    if (res.data.length < PAGE) break
  }
  if (error) {
    console.log(`${bucket}: nejde přečíst (${error.message}), přeskakuji`)
    continue
  }
  const doomed = []
  for (const item of top) {
    if (item.id === null) {
      if (!keep.has(item.name)) doomed.push(...(await listAll(bucket, item.name)))
    } else {
      doomed.push({ path: item.name, bytes: item.metadata?.size ?? 0 }) // soubor mimo složku
    }
  }
  const bytes = doomed.reduce((sum, f) => sum + f.bytes, 0)
  totalFiles += doomed.length
  totalBytes += bytes
  console.log(`${bucket}: ${doomed.length} souborů ke smazání (${(bytes / 1e6).toFixed(1)} MB)`)

  if (apply) {
    for (let i = 0; i < doomed.length; i += 100) {
      const chunk = doomed.slice(i, i + 100).map((f) => f.path)
      const { error: rmError } = await sb.storage.from(bucket).remove(chunk)
      if (rmError) throw new Error(`${bucket}: ${rmError.message}`)
    }
  }
}

console.log(
  `${apply ? 'Smazáno' : 'Smazal bych'}: ${totalFiles} souborů, ${(totalBytes / 1e6).toFixed(1)} MB.` +
    (apply ? '' : ' Spusť s --apply.'),
)
