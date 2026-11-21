import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  announcementMessage,
  handleNotify,
  parseRequest,
  nextDay,
  pragueDay,
  pragueHour,
  xpFor,
  type AnnouncementRow,
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
  announcements?: AnnouncementRow[]
  recipients?: Record<string, string[]>
  members?: Record<string, string[]>
  teachers?: Record<string, string[]>
  settings?: Record<string, Partial<Settings>>
  subs?: Subscription[]
  candidates?: ReminderCandidate[]
  due?: Record<string, { assignment: AssignmentRow; missing: string[] }[]>
  digest?: string[]
  waiting?: Record<string, { user_id: string }[]>
  caller?: string | null
  now?: Date
  gone?: string[]
  autoNotice?: { noticeId: string; deleteAfter: string; owners: string[] } | null
}) {
  const sent: { to: string; message: Message }[] = []
  const deleted: string[] = []
  const claimed = new Set<string>()
  const db: Db = {
    getLog: async (id) => opts.logs?.find((l) => l.id === id) ?? null,
    getAssignment: async (id) => opts.assignments?.find((a) => a.id === id) ?? null,
    getAnnouncement: async (id) => opts.announcements?.find((a) => a.id === id) ?? null,
    getName: async (id) => ({ p1: 'Pavel', t1: 'Jana Nováková' })[id] ?? null,
    assignmentRecipients: async (id) => opts.recipients?.[id] ?? [],
    classroomMembers: async (id) => opts.members?.[id] ?? [],
    teachersOf: async (id) => opts.teachers?.[id] ?? [],
    settings: async (ids) =>
      new Map(ids.filter((id) => opts.settings?.[id]).map((id) => [id, { ...DEFAULT_SETTINGS, ...opts.settings![id] }])),
    subscriptions: async (ids) => (opts.subs ?? []).filter((s) => ids.includes(s.user_id)),
    deleteSubscription: async (endpoint) => void deleted.push(endpoint),
    autoCleanupNotice: async () => opts.autoNotice ?? null,
    reminderCandidates: async () => opts.candidates ?? [],
    dueOn: async (day) => opts.due?.[day] ?? [],
    digestTeachers: async () => opts.digest ?? [],
    waitingSince: async (teacher) => opts.waiting?.[teacher] ?? [],
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

  it('announcement: to the pupils of the class, only from its teacher, once', async () => {
    const n1 = { id: 'N1', teacher_id: 't1', classroom_id: 'C1', body: '  V pátek\n koncert v 17:00  ' }
    const { deps, sent } = setup({
      announcements: [n1],
      members: { C1: ['p1', 'p2'] },
      settings: { p2: { assignments: false } },
      subs: [sub('p1'), sub('p2')],
      caller: 't2',
    })
    expect((await handleNotify({ type: 'announcement', announcementId: 'N1' }, 'jwt', deps)).status).toBe(403)
    const { deps: own, sent: ownSent } = setup({
      announcements: [n1],
      members: { C1: ['p1', 'p2'] },
      settings: { p2: { assignments: false } },
      subs: [sub('p1'), sub('p2')],
      caller: 't1',
    })
    await handleNotify({ type: 'announcement', announcementId: 'N1' }, 'jwt', own)
    expect(sent).toHaveLength(0)
    expect(ownSent.map((s) => s.to)).toEqual(['p1'])
    expect(ownSent[0].message).toMatchObject({ title: '📢 Oznámení od Jana Nováková', body: 'V pátek koncert v 17:00', url: '/student' })
    await handleNotify({ type: 'announcement', announcementId: 'N1' }, 'jwt', own)
    expect(ownSent).toHaveLength(1)
  })

  it('a long announcement is shortened', () => {
    const msg = announcementMessage({ id: 'x', teacher_id: 't', classroom_id: 'c', body: 'a'.repeat(300) }, null)
    expect(msg.body).toHaveLength(140)
    expect(msg.title).toBe('📢 Oznámení')
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

  it('test: to your own devices, again after 15 s, each one a notification of its own', async () => {
    const now = new Date('2026-11-17T10:00:01Z')
    const { deps, sent } = setup({ subs: [sub('p1'), sub('p2')], settings: { p1: { graded: false } }, now })
    expect((await handleNotify({ type: 'test' }, 'jwt', deps)).body.sent).toBe(1)
    expect(sent.map((s) => s.to)).toEqual(['p1'])
    expect((await handleNotify({ type: 'test' }, 'jwt', deps)).status).toBe(429)
    deps.now = new Date('2026-11-17T10:00:16Z')
    expect((await handleNotify({ type: 'test' }, 'jwt', deps)).body.sent).toBe(1)
    expect(sent).toHaveLength(2)
    expect(sent[0].message.tag).not.toBe(sent[1].message.tag)
  })

  it('reminders: need the cron secret', async () => {
    const { deps } = setup({})
    expect((await handleNotify({ type: 'reminders' }, 'jwt', deps)).status).toBe(401)
    expect((await handleNotify({ type: 'reminders' }, null, deps)).status).toBe(401)
  })

  it('storage nearly full: the owners of the largest files hear once a day, from 9:00', async () => {
    const autoNotice = { noticeId: 'N2', deleteAfter: '2026-11-17', owners: ['p1', 'p2'] }
    const early = setup({ now: new Date('2026-11-16T06:10:00Z'), autoNotice, subs: [sub('p1'), sub('p2')] }) // 7:10
    await handleNotify({ type: 'reminders' }, 'cron-secret', early.deps)
    expect(early.sent).toHaveLength(0)

    const { deps, sent } = setup({
      now: new Date('2026-11-16T09:10:00Z'), // 10:10 in Prague
      autoNotice,
      settings: { p2: { reminder: false, assignments: false } },
      subs: [sub('p1'), sub('p2'), sub('p3')],
    })
    await handleNotify({ type: 'reminders' }, 'cron-secret', deps)
    expect(sent.map((s) => s.to).sort()).toEqual(['p1', 'p2'])
    expect(sent[0].message).toMatchObject({ url: '/student/feedback', body: expect.stringContaining('Od 17. 11.') })
    await handleNotify({ type: 'reminders' }, 'cron-secret', deps)
    expect(sent).toHaveLength(2)
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

  it('due tomorrow: reminds the pupils who have not sent it, at their hour, once', async () => {
    const stupnice = { id: 'A1', teacher_id: 't1', classroom_id: 'C1', title: 'Stupnice C dur' }
    const { deps, sent } = setup({
      // 18:10 in Prague on 16 Nov -> due on the 17th
      now: new Date('2026-11-16T17:10:00Z'),
      due: { '2026-11-17': [{ assignment: stupnice, missing: ['p1', 'p2', 'p3'] }] },
      settings: { p2: { assignments: false }, p3: { reminder_hour: 20 } },
      subs: ['p1', 'p2', 'p3'].map((id) => sub(id)),
    })
    expect((await handleNotify({ type: 'reminders' }, 'cron-secret', deps)).body.sent).toBe(1)
    expect(sent[0]).toMatchObject({ to: 'p1', message: { title: 'Zítra je termín ⏰', body: 'Stupnice C dur – ještě ti chybí nahrávka.' } })
    await handleNotify({ type: 'reminders' }, 'cron-secret', deps)
    expect(sent).toHaveLength(1)
  })

  it('Czech date around midnight', () => {
    expect(pragueDay(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-17')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
  })

  it('daily summary: once a day at the teacher hour, instead of one per recording', async () => {
    const { deps, sent } = setup({
      now: new Date('2026-11-16T17:10:00Z'), // 18:10 in Prague
      logs: [log()],
      teachers: { p1: ['t1', 't2'] },
      digest: ['t1', 't3'],
      settings: { t1: { recordings_digest: true }, t3: { recordings_digest: true, reminder_hour: 20 } },
      waiting: { t1: [{ user_id: 'p1' }, { user_id: 'p1' }, { user_id: 'p2' }], t3: [{ user_id: 'p9' }] },
      subs: [sub('t1'), sub('t2'), sub('t3')],
    })
    // A new recording: only t2 (no summary) hears about it right away.
    await handleNotify({ type: 'recording', logId: 'L1' }, 'jwt', deps)
    expect(sent.map((s) => s.to)).toEqual(['t2'])
    sent.length = 0
    await handleNotify({ type: 'reminders' }, 'cron-secret', deps)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ to: 't1', message: { body: 'Za poslední den 3 nové nahrávky od 2 žáků.' } })
    await handleNotify({ type: 'reminders' }, 'cron-secret', deps)
    expect(sent).toHaveLength(1)
  })
})
