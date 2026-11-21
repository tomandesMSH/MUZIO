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
// badges }. It guesses the usual column names; check --inspect first and
// adjust it if the export looks different.
import { readFileSync, writeFileSync } from 'node:fs'
import { importSql, maskEmail, parseDump, rowsOf } from './base44-dump.mjs'

const pick = (row, names) => {
  for (const name of names) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === name)
    if (key && row[key] != null && row[key] !== '') return row[key]
  }
  return undefined
}

const listOf = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  const text = value.trim()
  if (text.startsWith('[')) {
    try {
      return JSON.parse(text)
    } catch {
      return []
    }
  }
  if (text.startsWith('{')) return text.slice(1, -1).split(',').map((s) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
  return text ? text.split(/[,;]/).map((s) => s.trim()) : []
}

export function pupilsFrom(tables) {
  const names = Object.keys(tables)
  const userTable = names.find((n) => (tables[n].columns ?? []).some((c) => c.toLowerCase() === 'email'))
  if (!userTable) throw new Error('V dumpu není tabulka se sloupcem email. Spusť --inspect a uprav pupilsFrom().')
  const users = rowsOf(tables, userTable)

  // Optional badge table: one row per awarded badge.
  const badgeTable = names.find((n) => /badge|odznak|reward|achievement/i.test(n) && n !== userTable)
  const badgesByUser = new Map()
  for (const row of badgeTable ? rowsOf(tables, badgeTable) : []) {
    const who = pick(row, ['user_id', 'student_id', 'created_by', 'user_email', 'student_email', 'email'])
    const name = pick(row, ['name', 'badge', 'badge_name', 'title', 'type', 'badge_id'])
    if (who == null || name == null) continue
    const key = String(who).toLowerCase()
    badgesByUser.set(key, [...(badgesByUser.get(key) ?? []), String(name)])
  }

  return users.map((u) => {
    const email = String(pick(u, ['email']) ?? '')
    const id = String(pick(u, ['id']) ?? '')
    return {
      email,
      fullName: pick(u, ['full_name', 'fullname', 'name', 'display_name']) ?? null,
      stars: pick(u, ['stars', 'hvezdy', 'star_count', 'total_stars']) ?? 0,
      flames: pick(u, ['flames', 'plaminky', 'flame_count', 'total_flames', 'practice_days']) ?? 0,
      badges: [
        ...listOf(pick(u, ['badges', 'odznaky'])),
        ...(badgesByUser.get(id.toLowerCase()) ?? []),
        ...(badgesByUser.get(email.toLowerCase()) ?? []),
      ],
    }
  })
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
