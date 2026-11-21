// What /api/migrate does (Migrace z Base44, migration 0055), with Supabase,
// the mailer and the clock passed in as `deps` so it can be tested.
//
//   request:  e-mail -> is it in the Base44 data? -> mail a one-time code
//   complete: e-mail + code + the new account's details -> create the account,
//             bring over flames, stars and badges
//
// E-mails are only ever stored hashed (sha256 of the trimmed, lower-cased
// address); the code is stored hashed too.
import { createHash, randomInt } from 'node:crypto'

export const CODE_TTL_MS = 15 * 60_000
export const MAX_ATTEMPTS = 5
export const MAX_SENDS_PER_HOUR = 3

export function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export function codeHash(emailHashValue: string, code: string): string {
  return createHash('sha256').update(`${emailHashValue}:${code.trim()}`).digest('hex')
}

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

// Same shim as src/lib/auth.ts makeInternalEmail.
export function internalEmail(username: string): string {
  return `${username.trim().toLowerCase().replace(/\s+/g, '')}@keyboardhero.internal`
}

// Auth refuses diacritics; keep usernames simple.
export function validUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,30}$/.test(username.trim().toLowerCase())
}

export interface CodeRow {
  email_hash: string
  code_hash: string
  expires_at: string
  attempts: number
  sent_count: number
  window_start: string
}

export interface ImportSummary {
  flames: number
  stars: number
  badges: number
}

export interface MigrateDeps {
  // Unclaimed Base44 row for this hash: true / claimed: 'claimed' / none: false.
  findImport(hash: string): Promise<true | 'claimed' | false>
  getCode(hash: string): Promise<CodeRow | null>
  saveCode(row: CodeRow): Promise<void>
  deleteCode(hash: string): Promise<void>
  sendCode(to: string, code: string): Promise<void>
  // The new user's id, or 'taken' when the username is in use.
  createUser(input: { email: string; password: string; fullName: string; dateOfBirth: string }): Promise<string | 'taken'>
  finishProfile(userId: string, consent: { dateOfBirth: string; guardianName: string | null }): Promise<void>
  // Undo a half-made account, so the pupil can simply try again.
  deleteUser(userId: string): Promise<void>
  applyImport(userId: string, hash: string): Promise<ImportSummary>
  now: Date
}

export type MigrateRequest =
  | { step: 'request'; email: string }
  | {
      step: 'complete'
      email: string
      code: string
      username: string
      fullName: string
      password: string
      dateOfBirth: string
      guardianName: string | null
    }

export interface MigrateResult {
  status: number
  body: { ok?: true; error?: string; summary?: ImportSummary }
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max

export function parseMigrateRequest(body: unknown): MigrateRequest | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!str(b.email, 254) || !String(b.email).includes('@')) return null
  if (b.step === 'request') return { step: 'request', email: String(b.email) }
  if (
    b.step === 'complete' &&
    str(b.code, 12) &&
    str(b.username, 30) &&
    str(b.fullName, 100) &&
    str(b.password, 100) &&
    typeof b.dateOfBirth === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.dateOfBirth)
  ) {
    return {
      step: 'complete',
      email: String(b.email),
      code: String(b.code),
      username: String(b.username),
      fullName: String(b.fullName).trim(),
      password: String(b.password),
      dateOfBirth: b.dateOfBirth,
      guardianName: str(b.guardianName, 100) ? String(b.guardianName).trim() : null,
    }
  }
  return null
}

const fail = (status: number, error: string): MigrateResult => ({ status, body: { error } })

export async function handleMigrate(request: MigrateRequest | null, deps: MigrateDeps): Promise<MigrateResult> {
  if (!request) return fail(400, 'Chybí nebo nesedí údaje.')
  const hash = emailHash(request.email)
  const found = await deps.findImport(hash)
  if (found === false) return fail(404, 'Tento e-mail v datech z Base44 nemáme. Zkontroluj, jestli je napsaný správně.')
  if (found === 'claimed') return fail(409, 'Data k tomuto e-mailu už byla přenesena do Muzia.')

  const now = deps.now.getTime()

  if (request.step === 'request') {
    const old = await deps.getCode(hash)
    const inWindow = old && now - new Date(old.window_start).getTime() < 60 * 60_000
    const sentCount = inWindow ? old.sent_count + 1 : 1
    if (sentCount > MAX_SENDS_PER_HOUR) return fail(429, 'Kód jsme poslali už několikrát. Zkus to prosím za hodinu.')
    const code = newCode()
    await deps.saveCode({
      email_hash: hash,
      code_hash: codeHash(hash, code),
      expires_at: new Date(now + CODE_TTL_MS).toISOString(),
      attempts: 0,
      sent_count: sentCount,
      window_start: inWindow ? old.window_start : deps.now.toISOString(),
    })
    await deps.sendCode(request.email.trim(), code)
    return { status: 200, body: { ok: true } }
  }

  const row = await deps.getCode(hash)
  if (!row || new Date(row.expires_at).getTime() < now) return fail(410, 'Kód vypršel. Pošli si prosím nový.')
  if (row.attempts >= MAX_ATTEMPTS) return fail(429, 'Příliš mnoho pokusů. Pošli si prosím nový kód.')
  if (row.code_hash !== codeHash(hash, request.code)) {
    await deps.saveCode({ ...row, attempts: row.attempts + 1 })
    return fail(401, 'Kód nesedí. Zkontroluj ho v e-mailu.')
  }
  if (!validUsername(request.username)) {
    return fail(400, 'Uživatelské jméno: 3 až 30 znaků, jen písmena bez diakritiky, číslice, tečka, pomlčka nebo podtržítko.')
  }
  if (request.password.length < 6) return fail(400, 'Heslo musí mít aspoň 6 znaků.')

  const userId = await deps.createUser({
    email: internalEmail(request.username),
    password: request.password,
    fullName: request.fullName,
    dateOfBirth: request.dateOfBirth,
  })
  if (userId === 'taken') return fail(409, 'Toto uživatelské jméno už někdo má. Vyber si jiné.')

  let summary: ImportSummary
  try {
    await deps.finishProfile(userId, { dateOfBirth: request.dateOfBirth, guardianName: request.guardianName })
    summary = await deps.applyImport(userId, hash)
  } catch {
    await deps.deleteUser(userId).catch(() => undefined)
    return fail(500, 'Přenos se nepovedl, účet jsme nezaložili. Zkus to prosím znovu.')
  }
  await deps.deleteCode(hash)
  return { status: 200, body: { ok: true, summary } }
}
