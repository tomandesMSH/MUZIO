import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  handleNotify,
  parseRequest,
  pragueHour,
  xpFor,
  type AssignmentRow,
  type Db,
  type Deps,
  type LogRow,
  type Message,
  type ReminderCandidate,
  type Settings,
  type Subscription,
} from './notify-core.js'

const sub = (user_id: string, endpoint = `https://push.example/${user_id}`): Subscription => ({
  endpoint,
  user_id,
  p256dh: 'k',
  auth: 'a',
})

function setup(opts: {
  logs?: LogRow[]
  assignments?: AssignmentRow[]
  recipients?: Record<string, string[]>
  members?: Record<string, string[]>
  teachers?: Record<string, string[]>
  settings?: Record<string, Partial<Settings>>
  subs?: Subscription[]
  candidates?: ReminderCandidate[]
  caller?: string | null
  now?: Date
  gone?: string[]
}) {
  const sent: { to: string; message: Message }[] = []
  const deleted: string[] = []
  const claimed = new Set<string>()
  const db: Db = {
    getLog: async (id) => opts.logs?.find((l) => l.id === id) ?? null,
    getAssignment: async (id) => opts.assignments?.find((a) => a.id === id) ?? null,
    getName: async (id) => ({ p1: 'Pavel', t1: 'Jana Nováková' })[id] ?? null,
    assignmentRecipients: async (id) => opts.recipients?.[id] ?? [],
    classroomMembers: async (id) => opts.members?.[id] ?? [],
    teachersOf: async (id) => opts.teachers?.[id] ?? [],
    settings: async (ids) =>
      new Map(ids.filter((id) => opts.settings?.[id]).map((id) => [id, { ...DEFAULT_SETTINGS, ...opts.settings![id] }])),
    subscriptions: async (ids) => (opts.subs ?? []).filter((s) => ids.includes(s.user_id)),
    deleteSubscription: async (endpoint) => void deleted.push(endpoint),
    reminderCandidates: async () => opts.candidates ?? [],
    claim: async (kind, ref) => {
      const key = `${kind}:${ref}`
      if (claimed.has(key)) return false
      claimed.add(key)
      return true
    },
  }
  const deps: Deps = {
    db,
    cronSecret: 'cron-secret',
    now: opts.now ?? new Date('2026-11-16T17:10:00Z'),
    userFromToken: async () => (opts.caller === undefined ? 'p1' : opts.caller),
    send: async (s, message) => {
      if (opts.gone?.includes(s.endpoint)) return 'gone'
      sent.push({ to: s.user_id, message })
      return 'ok'
    },
  }
  return { deps, sent, deleted }
}

const log = (over: Partial<LogRow> = {}): LogRow => ({
  id: 'L1',
  user_id: 'p1',
  rating: null,
  graded_by: null,
  assignment_id: null,
  duration_seconds: 180,
  ...over,
})

describe('notify', () => {
  it('parses only known requests', () => {
    expect(parseRequest({ type: 'graded', logId: 'x' })).toEqual({ type: 'graded', logId: 'x' })
    expect(parseRequest({ type: 'assignment', assignmentId: 'a' })).toEqual({ type: 'assignment', assignmentId: 'a' })
    expect(parseRequest({ type: 'graded' })).toBeNull()
    expect(parseRequest({ type: 'other', logId: 'x' })).toBeNull()
    expect(parseRequest(null)).toBeNull()
  })

  it('computes XP like the database', () => {
    expect(xpFor(4, 180)).toBe(12)
    expect(xpFor(5, 40)).toBe(5)
    expect(xpFor(3, 720)).toBe(15)
    expect(xpFor(2, null)).toBe(2)
  })

  it('tells the Czech hour, summer and winter', () => {
    expect(pragueHour(new Date('2026-11-16T17:10:00Z'))).toBe(18)
    expect(pragueHour(new Date('2026-07-01T16:10:00Z'))).toBe(18)
  })

  it('graded: only the grading teacher can send it, once, to the pupil', async () => {
    const graded = log({ rating: 4, graded_by: 't1' })
    const { deps, sent } = setup({ logs: [graded], subs: [sub('p1'), sub('t1')], caller: 't1' })
    expect((await handleNotify({ type: 'graded', logId: 'L1' }, 'jwt', deps)).body.sent).toBe(1)
    expect(sent[0].to).toBe('p1')
    expect(sent[0].message.body).toContain('🎵🎵🎵🎵 (+12 XP)')
    // Again (second tab, retry): nothing.
    expect((await handleNotify({ type: 'graded', logId: 'L1' }, 'jwt', deps)).body.sent).toBe(0)
    expect(sent).toHaveLength(1)
  })

  it('graded: refused for anyone else or an ungraded recording', async () => {
    const { deps, sent } = setup({ logs: [log({ rating: 4, graded_by: 't1' }), log({ id: 'L2' })], subs: [sub('p1')], caller: 'p1' })
    expect((await handleNotify({ type: 'graded', logId: 'L1' }, 'jwt', deps)).status).toBe(403)
    const asTeacher = setup({ logs: [log({ id: 'L2' })], subs: [sub('p1')], caller: 't1' })
    expect((await handleNotify({ type: 'graded', logId: 'L2' }, 'jwt', asTeacher.deps)).status).toBe(403)
    expect(sent).toHaveLength(0)
  })

  it('recording: to the teachers of the pupil, or to the assignment teacher', async () => {
    const { deps, sent } = setup({
      logs: [log(), log({ id: 'L2', assignment_id: 'A1' })],
      assignments: [{ id: 'A1', teacher_id: 't2', classroom_id: 'C1', title: 'Stupnice' }],
      teachers: { p1: ['t1', 't2', 't1'] },
      subs: [sub('t1'), sub('t2')],
    })
    await handleNotify({ type: 'recording', logId: 'L1' }, 'jwt', deps)
    expect(sent.map((s) => s.to).sort()).toEqual(['t1', 't2'])
    expect(sent[0].message.body).toBe('Pavel poslal(a) nahrávku k ohodnocení.')
    sent.length = 0
    await handleNotify({ type: 'recording', logId: 'L2' }, 'jwt', deps)
    expect(sent.map((s) => s.to)).toEqual(['t2'])
  })

  it('recording: only the pupil who sent it can announce it', async () => {
    const { deps } = setup({ logs: [log()], teachers: { p1: ['t1'] }, subs: [sub('t1')], caller: 'p2' })
    expect((await handleNotify({ type: 'recording', logId: 'L1' }, 'jwt', deps)).status).toBe(403)
  })

  it('assignment: to the chosen pupils, else the whole classroom; respects settings', async () => {
    const a1 = { id: 'A1', teacher_id: 't1', classroom_id: 'C1', title: 'Stupnice C dur' }
    const a2 = { ...a1, id: 'A2' }
    const { deps, sent } = setup({
      assignments: [a1, a2],
      recipients: { A1: ['p1'] },
      members: { C1: ['p1', 'p2', 'p3'] },
      settings: { p3: { assignments: false } },
      subs: [sub('p1'), sub('p2'), sub('p3')],
      caller: 't1',
    })
    await handleNotify({ type: 'assignment', assignmentId: 'A1' }, 'jwt', deps)
    expect(sent.map((s) => s.to)).toEqual(['p1'])
    expect(sent[0].message.body).toBe('Stupnice C dur (od Jana Nováková)')
    sent.length = 0
    await handleNotify({ type: 'assignment', assignmentId: 'A2' }, 'jwt', deps)
    expect(sent.map((s) => s.to)).toEqual(['p1', 'p2'])
  })

  it('drops subscriptions the browser no longer has', async () => {
    const { deps, deleted } = setup({
      logs: [log({ rating: 5, graded_by: 't1' })],
      subs: [sub('p1', 'https://push.example/old'), sub('p1', 'https://push.example/new')],
      gone: ['https://push.example/old'],
      caller: 't1',
    })
    expect((await handleNotify({ type: 'graded', logId: 'L1' }, 'jwt', deps)).body.sent).toBe(1)
    expect(deleted).toEqual(['https://push.example/old'])
  })

  it('test: to your own devices, at most once a minute', async () => {
    const { deps, sent } = setup({ subs: [sub('p1'), sub('p2')], settings: { p1: { graded: false } } })
    expect((await handleNotify({ type: 'test' }, 'jwt', deps)).body.sent).toBe(1)
    expect(sent.map((s) => s.to)).toEqual(['p1'])
    expect((await handleNotify({ type: 'test' }, 'jwt', deps)).status).toBe(429)
  })

  it('reminders: need the cron secret', async () => {
    const { deps } = setup({})
    expect((await handleNotify({ type: 'reminders' }, 'jwt', deps)).status).toBe(401)
    expect((await handleNotify({ type: 'reminders' }, null, deps)).status).toBe(401)
  })

  it('reminders: at the chosen hour, to pupils who have not practised today, once a day', async () => {
    const { deps, sent } = setup({
      // 18:10 in Prague
      now: new Date('2026-11-16T17:10:00Z'),
      candidates: [
        { user_id: 'p1', streak: 5, last_practice_date: '2026-11-15' },
        { user_id: 'p2', streak: 3, last_practice_date: '2026-11-16' },
        { user_id: 'p3', streak: 0, last_practice_date: null },
        { user_id: 'p4', streak: 1, last_practice_date: null },
        { user_id: 'p5', streak: 1, last_practice_date: null },
      ],
      settings: { p4: { reminder_hour: 20 }, p5: { reminder: false } },
      subs: ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => sub(id)),
    })
    expect((await handleNotify({ type: 'reminders' }, 'cron-secret', deps)).body.sent).toBe(2)
    expect(sent.map((s) => s.to)).toEqual(['p1', 'p3'])
    expect(sent[0].message.body).toContain('sérii 5 🔥')
    expect(sent[1].message.body).toBe('Dnes ještě žádná nahrávka. Stačí pár minut.')
    await handleNotify({ type: 'reminders' }, 'cron-secret', deps)
    expect(sent).toHaveLength(2)
  })
})
