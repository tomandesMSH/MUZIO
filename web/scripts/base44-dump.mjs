// Reading the Base44 export (.sql) for the migration (migration 0055).
// Understands INSERT INTO ... VALUES (...), (...); and pg_dump's COPY ... FROM
// stdin blocks. Pure functions; the command line is in import-base44.mjs.
import { createHash } from 'node:crypto'

export function emailHash(email) {
  return createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex')
}

const unquoteIdent = (s) => s.trim().replace(/^"(.*)"$/, '$1').replace(/^`(.*)`$/, '$1')
const bareName = (s) => unquoteIdent(s.split('.').pop())

// One SQL literal: 'text' (with '' and E'\n'), number, NULL, true/false,
// ARRAY[...] or '{...}' kept as text.
function readValues(src, start) {
  const values = []
  let i = start
  let current = ''
  let inString = false
  let depth = 0
  let quoted = false
  const push = () => {
    const raw = current.trim()
    if (quoted) values.push(raw)
    else if (/^null$/i.test(raw)) values.push(null)
    else if (/^true$/i.test(raw)) values.push(true)
    else if (/^false$/i.test(raw)) values.push(false)
    else if (/^-?\d+(\.\d+)?$/.test(raw)) values.push(Number(raw))
    else values.push(raw)
    current = ''
    quoted = false
  }
  for (; i < src.length; i++) {
    const c = src[i]
    if (inString) {
      if (c === "'" && src[i + 1] === "'") {
        current += "'"
        i++
      } else if (c === "'") inString = false
      else if (c === '\\' && src[i + 1] !== undefined) {
        const n = src[++i]
        current += n === 'n' ? '\n' : n === 't' ? '\t' : n
      } else current += c
      continue
    }
    if (c === "'") {
      inString = true
      quoted = true
      if (/[eE]$/.test(current.trim()) && current.trim().length === 1) current = ''
    } else if (c === '(' || c === '[') {
      depth++
      current += c
    } else if ((c === ')' || c === ']') && depth > 0) {
      depth--
      current += c
    } else if (c === ',' && depth === 0) push()
    else if (c === ')' && depth === 0) {
      push()
      return { values, end: i }
    } else current += c
  }
  throw new Error('Neukončená hodnota v INSERT')
}

function parseInserts(sql, tables) {
  const re = /insert\s+into\s+([^\s(]+)\s*(\(([^)]*)\))?\s*values\s*/gi
  let m
  while ((m = re.exec(sql))) {
    const table = bareName(m[1])
    const columns = m[3] ? m[3].split(',').map(unquoteIdent) : null
    let i = re.lastIndex
    const t = (tables[table] ??= { columns, rows: [] })
    if (!t.columns && columns) t.columns = columns
    for (;;) {
      while (/\s/.test(sql[i])) i++
      if (sql[i] !== '(') break
      const { values, end } = readValues(sql, i + 1)
      t.rows.push(values)
      i = end + 1
      while (/\s/.test(sql[i])) i++
      if (sql[i] === ',') {
        i++
        continue
      }
      break
    }
    re.lastIndex = i
  }
}

function parseCopy(sql, tables) {
  const re = /copy\s+([^\s(]+)\s*\(([^)]*)\)\s+from\s+stdin;\r?\n([\s\S]*?)\r?\n\\\.\r?\n/gi
  let m
  while ((m = re.exec(sql))) {
    const table = bareName(m[1])
    const columns = m[2].split(',').map(unquoteIdent)
    const t = (tables[table] ??= { columns, rows: [] })
    for (const line of m[3].split(/\r?\n/)) {
      if (!line) continue
      t.rows.push(
        line.split('\t').map((v) => {
          if (v === '\\N') return null
          const text = v.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')
          return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text
        }),
      )
    }
  }
}

// { tableName: { columns: string[] | null, rows: unknown[][] } }
export function parseDump(sql) {
  const tables = {}
  parseInserts(sql, tables)
  parseCopy(sql, tables)
  return tables
}

// Rows as objects (when the dump names the columns).
export function rowsOf(tables, name) {
  const t = tables[name]
  if (!t) return []
  return t.rows.map((r) => (t.columns ? Object.fromEntries(t.columns.map((c, i) => [c, r[i]])) : { ...r }))
}

export function maskEmail(value) {
  return typeof value === 'string' && value.includes('@') ? value.replace(/^(.).*(@.*)$/, '$1***$2') : value
}

// Base44 badge names -> Muzio teacher badge ids (migration 0045). The ones
// Muzio counts by itself (first recording, days practised) are left out.
export const BADGE_IDS = {
  'lovec not': 'lovec-not',
  'akordovy kouzelnik': 'akordovy-kouzelnik',
  'rytmicky mistr': 'rytmicky-mistr',
  'velky pokrok': 'velky-pokrok',
  'maly skladatel': 'maly-skladatel',
  'odvazny muzikant': 'odvazny-muzikant',
  'koncertni hvezda': 'koncertni-hvezda',
}

export function badgeId(name) {
  const key = String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return BADGE_IDS[key] ?? null
}

const sqlText = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const sqlInt = (v) => String(Math.max(0, Math.floor(Number(v) || 0)))

// The SQL that fills base44_import. pupils: { email, fullName, stars, flames, badges: string[] }.
export function importSql(pupils) {
  const lines = pupils
    .filter((p) => typeof p.email === 'string' && p.email.includes('@'))
    .map((p) => {
      const badges = [...new Set((p.badges ?? []).map(badgeId).filter(Boolean))]
      const arr = badges.length ? `array[${badges.map(sqlText).join(', ')}]::text[]` : `'{}'::text[]`
      return `  (${sqlText(emailHash(p.email))}, ${sqlText(p.fullName)}, ${sqlInt(p.stars)}, ${sqlInt(p.flames)}, ${arr})`
    })
  if (lines.length === 0) return '-- Nothing to import.\n'
  return `-- Base44 pupils for Migrace (migration 0055). E-mails are hashed.
-- Run in the Supabase SQL editor. Safe to run again: unclaimed rows are updated.
insert into base44_import (email_hash, full_name, stars, flames, badges) values
${lines.join(',\n')}
on conflict (email_hash) do update set
  full_name = excluded.full_name, stars = excluded.stars, flames = excluded.flames, badges = excluded.badges
  where base44_import.claimed_by is null;
`
}
