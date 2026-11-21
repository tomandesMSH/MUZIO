import { describe, expect, it, vi } from 'vitest'
import {
  codeHash,
  emailHash,
  handleMigrate,
  internalEmail,
  parseMigrateRequest,
  validUsername,
  type CodeRow,
  type MigrateDeps,
  type MigrateRequest,
} from './migrate-core.js'

const EMAIL = 'Pavel.Novak@Example.com'
const HASH = emailHash(EMAIL)

function setup(opts: { status?: true | 'claimed' | false; taken?: boolean; now?: Date } = {}) {
  const codes = new Map<string, CodeRow>()
  const sent: { to: string; code: string }[] = []
  const deps: MigrateDeps = {
    findImport: vi.fn(async (h: string) => (h === HASH ? (opts.status ?? true) : false)),
    getCode: async (h) => codes.get(h) ?? null,
    saveCode: async (row) => void codes.set(row.email_hash, row),
    deleteCode: async (h) => void codes.delete(h),
    sendCode: async (to, code) => void sent.push({ to, code }),
    createUser: vi.fn(async () => (opts.taken ? ('taken' as const) : 'user-1')),
    finishProfile: vi.fn(async () => {}),
    deleteUser: vi.fn(async () => {}),
    applyImport: vi.fn(async () => ({ flames: 12, stars: 4, badges: 2 })),
    now: opts.now ?? new Date('2026-11-22T10:00:00Z'),
  }
  return { deps, codes, sent }
}

const complete = (code: string, over: Partial<Extract<MigrateRequest, { step: 'complete' }>> = {}): MigrateRequest => ({
  step: 'complete',
  email: EMAIL,
  code,
  username: 'pavelnovak',
  fullName: 'Pavel Novák',
  password: 'tajne123',
  dateOfBirth: '2014-05-01',
  guardianName: 'Jana Nováková',
  ...over,
})

describe('helpers', () => {
  it('hashes the e-mail without case or spaces', () => {
    expect(emailHash(' pavel.novak@example.com ')).toBe(HASH)
    expect(HASH).toMatch(/^[0-9a-f]{64}$/)
  })

  it('makes the internal e-mail like the app and checks usernames', () => {
    expect(internalEmail(' PavelNovak ')).toBe('pavelnovak@keyboardhero.internal')
    expect(validUsername('pavel.novak')).toBe(true)
    expect(validUsername('pavelnovák')).toBe(false)
    expect(validUsername('pa')).toBe(false)
  })

  it('parses only full requests', () => {
    expect(parseMigrateRequest({ step: 'request', email: 'a@b.cz' })).toEqual({ step: 'request', email: 'a@b.cz' })
    expect(parseMigrateRequest({ step: 'request', email: 'nope' })).toBeNull()
    expect(parseMigrateRequest({ step: 'complete', email: 'a@b.cz', code: '1' })).toBeNull()
  })
})

describe('handleMigrate', () => {
  it('an unknown e-mail gets no code', async () => {
    const { deps, sent } = setup()
    const r = await handleMigrate({ step: 'request', email: 'nekdo@jiny.cz' }, deps)
    expect(r.status).toBe(404)
    expect(sent).toHaveLength(0)
  })

  it('already claimed data is refused', async () => {
    const { deps } = setup({ status: 'claimed' })
    expect((await handleMigrate({ step: 'request', email: EMAIL }, deps)).status).toBe(409)
  })

  it('mails a code and stores only its hash', async () => {
    const { deps, codes, sent } = setup()
    const r = await handleMigrate({ step: 'request', email: EMAIL }, deps)
    expect(r.status).toBe(200)
    expect(sent[0].to).toBe(EMAIL)
    expect(sent[0].code).toMatch(/^\d{6}$/)
    const row = codes.get(HASH)!
    expect(row.code_hash).toBe(codeHash(HASH, sent[0].code))
    expect(JSON.stringify(row)).not.toContain(sent[0].code)
  })

  it('sends at most 3 codes an hour', async () => {
    const { deps } = setup()
    for (let i = 0; i < 3; i++) expect((await handleMigrate({ step: 'request', email: EMAIL }, deps)).status).toBe(200)
    expect((await handleMigrate({ step: 'request', email: EMAIL }, deps)).status).toBe(429)
  })

  it('a wrong code counts a try, five wrong ones lock it', async () => {
    const { deps, sent } = setup()
    await handleMigrate({ step: 'request', email: EMAIL }, deps)
    const wrong = sent[0].code === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) expect((await handleMigrate(complete(wrong), deps)).status).toBe(401)
    expect((await handleMigrate(complete(sent[0].code), deps)).status).toBe(429)
    expect(deps.createUser).not.toHaveBeenCalled()
  })

  it('an expired code is refused', async () => {
    const { deps, sent } = setup()
    await handleMigrate({ step: 'request', email: EMAIL }, deps)
    deps.now = new Date('2026-11-22T10:20:00Z')
    expect((await handleMigrate(complete(sent[0].code), deps)).status).toBe(410)
  })

  it('a taken username is refused and nothing is imported', async () => {
    const { deps, sent } = setup({ taken: true })
    await handleMigrate({ step: 'request', email: EMAIL }, deps)
    expect((await handleMigrate(complete(sent[0].code), deps)).status).toBe(409)
    expect(deps.applyImport).not.toHaveBeenCalled()
  })

  it('a failed import removes the new account again', async () => {
    const { deps, codes, sent } = setup()
    deps.applyImport = vi.fn(async () => {
      throw new Error('db')
    })
    await handleMigrate({ step: 'request', email: EMAIL }, deps)
    expect((await handleMigrate(complete(sent[0].code), deps)).status).toBe(500)
    expect(deps.deleteUser).toHaveBeenCalledWith('user-1')
    expect(codes.has(HASH)).toBe(true)
  })

  it('the right code creates the account and brings the stats over once', async () => {
    const { deps, codes, sent } = setup()
    await handleMigrate({ step: 'request', email: EMAIL }, deps)
    const r = await handleMigrate(complete(sent[0].code), deps)
    expect(r).toEqual({ status: 200, body: { ok: true, summary: { flames: 12, stars: 4, badges: 2 } } })
    expect(deps.createUser).toHaveBeenCalledWith({
      email: 'pavelnovak@keyboardhero.internal',
      password: 'tajne123',
      fullName: 'Pavel Novák',
      dateOfBirth: '2014-05-01',
    })
    expect(deps.finishProfile).toHaveBeenCalledWith('user-1', { dateOfBirth: '2014-05-01', guardianName: 'Jana Nováková' })
    expect(deps.applyImport).toHaveBeenCalledTimes(1)
    expect(codes.has(HASH)).toBe(false)
  })
})
