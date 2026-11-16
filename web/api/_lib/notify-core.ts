// What /api/notify does, without Supabase or web-push in it (those come in
// as `deps`), so it can be tested. Files under api/_lib aren't functions
// themselves - Vercel skips paths starting with an underscore.

export type NotifyRequest =
  | { type: 'graded'; logId: string }
  | { type: 'recording'; logId: string }
  | { type: 'assignment'; assignmentId: string }
  | { type: 'reminders' }
  // "Poslat zkušební" in the settings: to the caller's own devices.
  | { type: 'test' }

export interface LogRow {
  id: string
  user_id: string
  rating: number | null
  graded_by: string | null
  assignment_id: string | null
  duration_seconds: number | null
}

export interface AssignmentRow {
  id: string
  teacher_id: string
  classroom_id: string
  title: string
}

export interface Settings {
  graded: boolean
  assignments: boolean
  reminder: boolean
  reminder_hour: number
  recordings: boolean
}

// Same defaults as the notification_settings table (migration 0035).
export const DEFAULT_SETTINGS: Settings = {
  graded: true,
  assignments: true,
  reminder: true,
  reminder_hour: 18,
  recordings: true,
}

export interface Subscription {
  endpoint: string
  user_id: string
  p256dh: string
  auth: string
}

export interface ReminderCandidate {
  user_id: string
  streak: number
  last_practice_date: string | null
}

// An assignment due tomorrow and the pupils who haven't sent it yet.
export interface DueSoon {
  assignment: AssignmentRow
  missing: string[]
}

export interface Db {
  getLog(id: string): Promise<LogRow | null>
  getAssignment(id: string): Promise<AssignmentRow | null>
  getName(userId: string): Promise<string | null>
  // Explicit recipients, or [] = the whole classroom.
  assignmentRecipients(assignmentId: string): Promise<string[]>
  classroomMembers(classroomId: string): Promise<string[]>
  // Teachers of the classrooms the pupil is in.
  teachersOf(studentId: string): Promise<string[]>
  settings(userIds: string[]): Promise<Map<string, Settings>>
  subscriptions(userIds: string[]): Promise<Subscription[]>
  deleteSubscription(endpoint: string): Promise<void>
  // Pupils who have at least one subscription.
  reminderCandidates(): Promise<ReminderCandidate[]>
  // Assignments due on that day (YYYY-MM-DD) with who still owes a recording.
  dueOn(day: string): Promise<DueSoon[]>
  // True the first time (kind, ref) is claimed - the "sent already" guard.
  claim(kind: string, ref: string): Promise<boolean>
}

export interface Message {
  title: string
  body: string
  url: string
  tag: string
}

export interface Deps {
  db: Db
  // 'gone' = the browser dropped the subscription (HTTP 404/410): delete it.
  send(subscription: Subscription, message: Message): Promise<'ok' | 'gone' | 'failed'>
  // The signed-in user behind a bearer token, or null.
  userFromToken(token: string): Promise<string | null>
  cronSecret: string | undefined
  now: Date
}

export interface Result {
  status: number
  body: { sent?: number; error?: string }
}

// The XP a graded recording gives - same formula as xp_for_log (migration 0024)
// and xpForLog in src/lib/game-logic.ts.
export function xpFor(rating: number, durationSeconds: number | null): number {
  const minutes = Math.min(Math.max(Math.ceil((durationSeconds ?? 60) / 60), 1), 5)
  return minutes * rating
}

// The hour (0-23) in Czech time.
export function pragueHour(now: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', hour: 'numeric', hourCycle: 'h23' }).format(now)
  return Number(hour)
}

// Today's date in Czech time, YYYY-MM-DD (deadlines are Czech days).
export function pragueDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(now)
}

export function nextDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function dueMessage(assignment: AssignmentRow): Message {
  return {
    title: 'Zítra je termín ⏰',
    body: `${assignment.title} – ještě ti chybí nahrávka.`,
    url: '/student/lessons',
    tag: `due-${assignment.id}`,
  }
}

// The day a streak counts (record_practice_session uses the UTC date).
export function streakDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

export function gradedMessage(log: LogRow): Message {
  const rating = log.rating ?? 0
  return {
    title: 'Nahrávka je ohodnocená 🎵',
    body: `Učitel ti dal ${'🎵'.repeat(rating)} (+${xpFor(rating, log.duration_seconds)} XP). Podívej se, co ti napsal.`,
    url: '/student/feedback',
    tag: `graded-${log.id}`,
  }
}

export function assignmentMessage(assignment: AssignmentRow, teacherName: string | null): Message {
  return {
    title: 'Nový úkol 📋',
    body: teacherName ? `${assignment.title} (od ${teacherName})` : assignment.title,
    url: '/student/lessons',
    tag: `assignment-${assignment.id}`,
  }
}

export function recordingMessage(log: LogRow, pupilName: string | null): Message {
  return {
    title: 'Nová nahrávka 🎧',
    body: `${pupilName ?? 'Žák'} poslal(a) nahrávku k ohodnocení.`,
    url: '/teacher/grading',
    tag: `recording-${log.id}`,
  }
}

export function reminderMessage(candidate: ReminderCandidate): Message {
  return {
    title: 'Čas na cvičení 🎹',
    body:
      candidate.streak > 0
        ? `Dnes jsi ještě necvičil(a). Neztrať sérii ${candidate.streak} 🔥!`
        : 'Dnes ještě žádná nahrávka. Stačí pár minut.',
    url: '/student/recording',
    tag: 'reminder',
  }
}

export function testMessage(): Message {
  return { title: 'Muzio 🎵', body: 'Notifikace fungují. Takhle ti dáme vědět.', url: '/', tag: 'test' }
}

export function parseRequest(body: unknown): NotifyRequest | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const id = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 64
  if ((b.type === 'graded' || b.type === 'recording') && id(b.logId)) return { type: b.type, logId: b.logId as string }
  if (b.type === 'assignment' && id(b.assignmentId)) return { type: 'assignment', assignmentId: b.assignmentId as string }
  if (b.type === 'reminders') return { type: 'reminders' }
  if (b.type === 'test') return { type: 'test' }
  return null
}

const unique = (ids: string[]) => [...new Set(ids)]

// Sends `message` to every device of `userIds` whose settings allow `kind`.
async function deliver(deps: Deps, userIds: string[], allowed: (s: Settings) => boolean, message: Message): Promise<number> {
  const ids = unique(userIds)
  if (ids.length === 0) return 0
  const settings = await deps.db.settings(ids)
  const wanted = ids.filter((id) => allowed(settings.get(id) ?? DEFAULT_SETTINGS))
  if (wanted.length === 0) return 0
  const subscriptions = await deps.db.subscriptions(wanted)
  let sent = 0
  for (const subscription of subscriptions) {
    const outcome = await deps.send(subscription, message)
    if (outcome === 'ok') sent++
    else if (outcome === 'gone') await deps.db.deleteSubscription(subscription.endpoint)
  }
  return sent
}

const forbidden: Result = { status: 403, body: { error: 'forbidden' } }

export async function handleNotify(request: NotifyRequest | null, bearer: string | null, deps: Deps): Promise<Result> {
  if (!request) return { status: 400, body: { error: 'bad request' } }
  if (!bearer) return { status: 401, body: { error: 'unauthorized' } }

  if (request.type === 'reminders') {
    if (!deps.cronSecret || bearer !== deps.cronSecret) return { status: 401, body: { error: 'unauthorized' } }
    const hour = pragueHour(deps.now)
    const today = streakDay(deps.now)
    const candidates = await deps.db.reminderCandidates()
    const settings = await deps.db.settings(candidates.map((c) => c.user_id))
    let sent = 0
    for (const candidate of candidates) {
      const s = settings.get(candidate.user_id) ?? DEFAULT_SETTINGS
      if (!s.reminder || s.reminder_hour !== hour || candidate.last_practice_date === today) continue
      if (!(await deps.db.claim('reminder', `${candidate.user_id}:${today}`))) continue
      sent += await deliver(deps, [candidate.user_id], (x) => x.reminder, reminderMessage(candidate))
    }

    // The evening before a deadline, at the pupil's reminder hour.
    const due = await deps.db.dueOn(nextDay(pragueDay(deps.now)))
    const dueSettings = await deps.db.settings([...new Set(due.flatMap((d) => d.missing))])
    for (const { assignment, missing } of due) {
      for (const pupil of missing) {
        const s = dueSettings.get(pupil) ?? DEFAULT_SETTINGS
        if (!s.assignments || s.reminder_hour !== hour) continue
        if (!(await deps.db.claim('due', `${assignment.id}:${pupil}`))) continue
        sent += await deliver(deps, [pupil], (x) => x.assignments, dueMessage(assignment))
      }
    }
    return { status: 200, body: { sent } }
  }

  const caller = await deps.userFromToken(bearer)
  if (!caller) return { status: 401, body: { error: 'unauthorized' } }

  if (request.type === 'test') {
    // At most one a minute.
    if (!(await deps.db.claim('test', `${caller}:${deps.now.toISOString().slice(0, 16)}`))) {
      return { status: 429, body: { error: 'too many' } }
    }
    return { status: 200, body: { sent: await deliver(deps, [caller], () => true, testMessage()) } }
  }

  if (request.type === 'graded') {
    const log = await deps.db.getLog(request.logId)
    if (!log || log.rating == null || log.graded_by !== caller) return forbidden
    if (!(await deps.db.claim('graded', log.id))) return { status: 200, body: { sent: 0 } }
    return { status: 200, body: { sent: await deliver(deps, [log.user_id], (s) => s.graded, gradedMessage(log)) } }
  }

  if (request.type === 'recording') {
    const log = await deps.db.getLog(request.logId)
    if (!log || log.user_id !== caller) return forbidden
    if (!(await deps.db.claim('recording', log.id))) return { status: 200, body: { sent: 0 } }
    // A recording for an assignment goes to that assignment's teacher; any
    // other one to the teachers of the pupil's classrooms.
    const assignment = log.assignment_id ? await deps.db.getAssignment(log.assignment_id) : null
    const teachers = assignment ? [assignment.teacher_id] : await deps.db.teachersOf(log.user_id)
    const message = recordingMessage(log, await deps.db.getName(log.user_id))
    return { status: 200, body: { sent: await deliver(deps, teachers, (s) => s.recordings, message) } }
  }

  const assignment = await deps.db.getAssignment(request.assignmentId)
  if (!assignment || assignment.teacher_id !== caller) return forbidden
  if (!(await deps.db.claim('assignment', assignment.id))) return { status: 200, body: { sent: 0 } }
  const explicit = await deps.db.assignmentRecipients(assignment.id)
  const pupils = explicit.length > 0 ? explicit : await deps.db.classroomMembers(assignment.classroom_id)
  const message = assignmentMessage(assignment, await deps.db.getName(assignment.teacher_id))
  return { status: 200, body: { sent: await deliver(deps, pupils, (s) => s.assignments, message) } }
}
