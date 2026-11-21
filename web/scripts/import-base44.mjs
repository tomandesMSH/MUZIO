#!/usr/bin/env node
// Turns the Base44 export into SQL for base44_import (Migrace, migration 0055).
// Runs locally; the dump and the e-mails never leave this computer, the
// output holds only e-mail hashes.
//
//   node scripts/import-base44.mjs <dump.sql> --inspect
//       tables, columns, row counts and two sample rows (e-mails masked)
//   node scripts/import-base44.mjs <dump.sql> --out base44_import.sql
//       the SQL to run in the Supabase SQL editor
//
// pupilsFrom() below maps the export to { email, fullName, stars, flames,
// badges }; it follows the tables of the real Base44 export.
import { readFileSync, writeFileSync } from 'node:fs'
import { importSql, maskEmail, parseDump, rowsOf } from './base44-dump.mjs'

// The Base44 export (BASE44DB.sql, 2026-11-22): `users` holds the pupils
// (role 'user'; 'admin' are the teacher and the developer), stars in
// users.stars; flames are the distinct days in `practice_days` (recordings
// and days the teacher added) and `completed_tasks`; badges are the
// teacher-given rows of `badge_awards` (badge_key like note_hunter). The
// automatic badges (first recording, days practised) Muzio counts by itself,
// and Hudební posel has no Muzio counterpart, so those are skipped.
export function pupilsFrom(tables) {
  if (!tables.users) throw new Error('V dumpu chybí tabulka users. Spusť --inspect a uprav pupilsFrom().')
  const days = new Map()
  const addDay = (who, date) => {
    if (!who || !date) return
    const key = String(date).slice(0, 10)
    days.set(who, (days.get(who) ?? new Set()).add(key))
  }
  for (const d of rowsOf(tables, 'practice_days')) addDay(d.student_id, d.practice_date)
  for (const c of rowsOf(tables, 'completed_tasks')) addDay(c.created_by_id, c.completion_date)

  const badges = new Map()
  for (const a of rowsOf(tables, 'badge_awards')) {
    if (a.awarded_by !== 'teacher' || !a.student_id) continue
    badges.set(a.student_id, [...(badges.get(a.student_id) ?? []), String(a.badge_key)])
  }

  return rowsOf(tables, 'users')
    .filter((u) => u.role !== 'admin' && !u.disabled)
    .map((u) => ({
      email: String(u.email ?? ''),
      fullName: u.full_name ?? null,
      stars: Number(u.stars) || 0,
      flames: Math.max(days.get(u.id)?.size ?? 0, Number(u.flames) || 0),
      badges: badges.get(u.id) ?? [],
    }))
}

function main() {
  const [file, ...flags] = process.argv.slice(2)
  if (!file) {
    console.error('Použití: node scripts/import-base44.mjs <dump.sql> --inspect | --out base44_import.sql')
    process.exit(1)
  }
  const tables = parseDump(readFileSync(file, 'utf8'))

  if (flags.includes('--inspect')) {
    for (const [name, t] of Object.entries(tables)) {
      console.log(`\n${name}: ${t.rows.length} řádků`)
      console.log(`  sloupce: ${(t.columns ?? ['(bez názvů)']).join(', ')}`)
      for (const row of rowsOf(tables, name).slice(0, 2)) {
        console.log('  ', JSON.stringify(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, maskEmail(v)]))))
      }
    }
    return
  }

  const outIndex = flags.indexOf('--out')
  const out = outIndex >= 0 ? flags[outIndex + 1] : 'base44_import.sql'
  const pupils = pupilsFrom(tables)
  writeFileSync(out, importSql(pupils))
  const withBadges = pupils.filter((p) => p.badges.length > 0).length
  console.log(`Hotovo: ${out}, žáků ${pupils.length}, s odznaky ${withBadges}. Spusť ho v Supabase SQL editoru.`)
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('import-base44.mjs')) main()
