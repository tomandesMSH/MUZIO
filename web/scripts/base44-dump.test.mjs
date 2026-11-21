import { describe, expect, it } from 'vitest'
import { badgeId, emailHash, importSql, maskEmail, parseDump, rowsOf } from './base44-dump.mjs'

const INSERT_DUMP = `
CREATE TABLE "public"."User" (id text, email text, full_name text);
INSERT INTO "public"."User" ("id", "email", "full_name") VALUES ('u1', 'Pavel@Example.com', 'Pavel O''Brien'), ('u2', 'jana@example.com', NULL);
INSERT INTO Progress (user_id, stars, flames, done) VALUES ('u1', 4, 12, true);
`

const COPY_DUMP = `
COPY public.badge (user_id, name) FROM stdin;
u1\tLovec not
u1\tPrvní nahrávka
u2\t\\N
\\.
`

describe('parseDump', () => {
  it('reads INSERTs with quoted names, escapes, NULL and booleans', () => {
    const tables = parseDump(INSERT_DUMP)
    expect(rowsOf(tables, 'User')).toEqual([
      { id: 'u1', email: 'Pavel@Example.com', full_name: "Pavel O'Brien" },
      { id: 'u2', email: 'jana@example.com', full_name: null },
    ])
    expect(rowsOf(tables, 'Progress')).toEqual([{ user_id: 'u1', stars: 4, flames: 12, done: true }])
  })

  it('reads pg_dump COPY blocks', () => {
    expect(rowsOf(parseDump(COPY_DUMP), 'badge')).toEqual([
      { user_id: 'u1', name: 'Lovec not' },
      { user_id: 'u1', name: 'První nahrávka' },
      { user_id: 'u2', name: null },
    ])
  })
})

describe('badges and output', () => {
  it('maps Base44 badge names to Muzio ids, skips the automatic ones', () => {
    expect(badgeId('Akordový kouzelník')).toBe('akordovy-kouzelnik')
    expect(badgeId('KONCERTNÍ HVĚZDA')).toBe('koncertni-hvezda')
    expect(badgeId('První nahrávka')).toBeNull()
  })

  it('masks e-mails for --inspect', () => {
    expect(maskEmail('pavel@example.com')).toBe('p***@example.com')
  })

  it('writes hashed e-mails only', () => {
    const sql = importSql([
      { email: 'Pavel@Example.com', fullName: "Pavel O'Brien", stars: 4, flames: 12, badges: ['Lovec not', 'První nahrávka'] },
      { email: 'bez-zavinace', fullName: 'X', stars: 1, flames: 1, badges: [] },
    ])
    expect(sql).toContain(emailHash('pavel@example.com'))
    expect(sql).not.toMatch(/example\.com/i)
    expect(sql).toContain("'Pavel O''Brien', 4, 12, array['lovec-not']::text[]")
    expect(sql).not.toContain('bez-zavinace')
  })
})

describe('Base44 badge keys', () => {
  it('maps the export keys, skips the ones without a Muzio badge', () => {
    expect(badgeId('note_hunter')).toBe('lovec-not')
    expect(badgeId('brave_musician')).toBe('odvazny-muzikant')
    expect(badgeId('music_messenger')).toBeNull()
    expect(badgeId('days_7')).toBeNull()
  })
})
