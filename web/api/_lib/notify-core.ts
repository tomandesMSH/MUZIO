// What /api/notify does, without Supabase or web-push in it (those come in
// as `deps`), so it can be tested. Files under api/_lib aren't functions
// themselves - Vercel skips paths starting with an underscore.

export type NotifyRequest =
  | { type: 'graded'; logId: string }
  | { type: 'recording'; logId: string }
  | { type: 'assignment'; assignmentId: string }
  // A class announcement (migration 0041): to the pupils of the class.
  | { type: 'announcement'; announcementId: string }
  // Hudební pošta (migration 0052): to one pupil.
  | { type: 'message'; messageId: string }
  // Pozvánka do třídy (migration 0062): to the invited pupil.
  | { type: 'invite'; inviteId: string }
  | { type: 'reminders' }
  // "Oznámit čištění" by an admin (migration 0046): to every pupil.
  | { type: 'cleanup'; noticeId: string }
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

export interface AnnouncementRow {
  id: string
  classroom_id: string
  teacher_id: string
  body: string
}

export interface CleanupNoticeRow {
  id: string
  kind: 'all' | 'largest'
  delete_after: string // YYYY-MM-DD
  created_by: string | null
}

export interface MessageRow {
  id: string
  teacher_id: string
  student_id: string
  body: string
}

export interface InviteRow {
  id: string
  student_id: string
  invited_by: string | null
  classroom_name: string
}

export interface Settings {
  graded: boolean
  assignments: boolean
  reminder: boolean
  reminder_hour: number
  recordings: boolean
  // One summary a day instead of a notification per recording (migration 0038).
  recordings_digest: boolean
}

// Same defaults as the notification_settings table (migration 0035).
export const DEFAULT_SETTINGS: Settings = {
  graded: true,
  assignments: true,
  reminder: true,
  reminder_hour: 18,
  recordings: true,
  recordings_digest: false,
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
  getAnnouncement(id: string): Promise<AnnouncementRow | null>
  getMessage(id: string): Promise<MessageRow | null>
  getInvite(id: string): Promise<InviteRow | null>
  getName(userId: string): Promise<string | null>
  // Explicit recipients, or [] = the whole classroom.
  assignmentRecipients(assignmentId: string): Promise<string[]>
  classroomMembers(classroomId: string): Promise<string[]>
  // Teachers of the classrooms the pupil is in.
  teachersOf(studentId: string): Promise<string[]>
  settings(userIds: string[]): Promise<Map<string, Settings>>
  subscriptions(userIds: string[]): Promise<Subscription[]>
  deleteSubscription(endpoint: string): Promise<void>
  // Storage nearly full (migration 0047): a new notice about the largest
  // files and the pupils who own them, or null when none is needed.
  autoCleanupNotice(limitBytes: number): Promise<{ noticeId: string; deleteAfter: string; owners: string[] } | null>
  // Pupils who have at least one subscription.
  reminderCandidates(): Promise<ReminderCandidate[]>
  // Assignments due on that day (YYYY-MM-DD) with who still owes a recording.
  dueOn(day: string): Promise<DueSoon[]>
  // Teachers who have a subscription and want the daily summary.
  digestTeachers(): Promise<string[]>
  // Ungraded recordings of this teacher's pupils sent since then.
  waitingSince(teacherId: string, sinceIso: string): Promise<{ user_id: string }[]>
  getCleanupNotice(id: string): Promise<CleanupNoticeRow | null>
  isModerator(userId: string): Promise<boolean>
  // Every pupil who isn't banned (who has a device is decided later).
  allPupils(): Promise<string[]>
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

function czechPlural(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many
}

export function digestMessage(recordings: number, pupils: number): Message {
  return {
    title: 'Nahrávky ke kontrole 🎧',
    body: `Za poslední den ${recordings} ${czechPlural(recordings, 'nová nahrávka', 'nové nahrávky', 'nových nahrávek')} od ${pupils} ${czechPlural(pupils, 'žáka', 'žáků', 'žáků')}.`,
    url: '/teacher',
    tag: 'digest',
  }
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

// The body shortened for the notification (the whole text is in the app).
export function announcementMessage(announcement: AnnouncementRow, teacherName: string | null): Message {
  const text = announcement.body.trim().replace(/\s+/g, ' ')
  return {
    title: teacherName ? `📢 Oznámení od ${teacherName}` : '📢 Oznámení',
    body: text.length > 140 ? `${text.slice(0, 139)}…` : text,
    url: '/student',
    tag: `announcement-${announcement.id}`,
  }
}

// "1. 12." - the day the clearing may start.
export function czechDay(day: string): string {
  const [, m, d] = day.split('-').map(Number)
  return `${d}. ${m}.`
}

export function cleanupMessage(notice: CleanupNoticeRow): Message {
  return {
    title: 'Ulož si své nahrávky',
    body:
      notice.kind === 'all'
        ? `Od ${czechDay(notice.delete_after)} budeme mazat staré nahrávky. Stáhni si ty, na kterých ti záleží.`
        : `Od ${czechDay(notice.delete_after)} smažeme tvoje největší nahrávky, dochází místo. Stáhni si je, jestli o ně stojíš.`,
    url: '/student/feedback',
    tag: `cleanup-${notice.id}`,
  }
}

// The text shortened for the notification (the whole message is in the app).
export function pupilMessage(message: MessageRow, teacherName: string | null): Message {
  const text = message.body.trim().replace(/\s+/g, ' ')
  return {
    title: teacherName ? `Zpráva od ${teacherName}` : 'Nová zpráva',
    body: text.length > 140 ? `${text.slice(0, 139)}…` : text,
    url: '/student',
    tag: `message-${message.id}`,
  }
}

export function inviteMessage(invite: InviteRow, teacherName: string | null): Message {
  return {
    title: 'Pozvánka do třídy',
    body: `${teacherName ?? 'Učitel'} tě zve do třídy „${invite.classroom_name}“.`,
    url: '/student/classes',
    tag: `invite-${invite.id}`,
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

export function reminderMessage(_candidate: ReminderCandidate): Message {
  return {
    title: 'Čas na cvičení 🎹',
    // Flames (lib/flames.ts) don't need days in a row, so no "streak" talk.
    body: 'Dnes ti ještě chybí plamínek 🔥. Stačí pár minut.',
    url: '/student/recording',
    tag: 'reminder',
  }
}

// Same as FREE_STORAGE_BYTES in src/lib/data/adminUsage.ts (Supabase free plan).
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024

// The storage check runs once a day, from this hour (Czech time) on.
export const STORAGE_CHECK_HOUR = 9

export function largestFilesMessage(noticeId: string, deleteAfter: string): Message {
  const [, m, d] = deleteAfter.split('-').map(Number)
  return {
    title: 'Ulož si své nahrávky',
    body: `V aplikaci dochází místo. Od ${d}. ${m}. smažeme tvoje největší nahrávky, stáhni si je, jestli o ně stojíš.`,
    url: '/student/feedback',
    tag: `cleanup-${noticeId}`,
  }
}

// A tag of its own each time: with the same tag the phone would just swap it
// for the previous test quietly, and it would look like nothing came.
export function testMessage(now: Date): Message {
  return { title: 'MUZIO 🎵', body: 'Notifikace fungují. Takhle ti dáme vědět.', url: '/', tag: `test-${now.getTime()}` }
}

// "Poslat zkušební" can be pressed again after this many seconds.
export const TEST_EVERY_SECONDS = 15

export function parseRequest(body: unknown): NotifyRequest | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const id = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 64
  if ((b.type === 'graded' || b.type === 'recording') && id(b.logId)) return { type: b.type, logId: b.logId as string }
  if (b.type === 'assignment' && id(b.assignmentId)) return { type: 'assignment', assignmentId: b.assignmentId as string }
  if (b.type === 'announcement' && id(b.announcementId)) {
    return { type: 'announcement', announcementId: b.announcementId as string }
  }
  if (b.type === 'message' && id(b.messageId)) return { type: 'message', messageId: b.messageId as string }
  if (b.type === 'invite' && id(b.inviteId)) return { type: 'invite', inviteId: b.inviteId as string }
  if (b.type === 'reminders') return { type: 'reminders' }
  if (b.type === 'cleanup' && id(b.noticeId)) return { type: 'cleanup', noticeId: b.noticeId as string }
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

    // Teachers' daily summary of new recordings, at their hour.
    const teachers = await deps.db.digestTeachers()
    const teacherSettings = await deps.db.settings(teachers)
    const since = new Date(deps.now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    for (const teacher of teachers) {
      const s = teacherSettings.get(teacher) ?? DEFAULT_SETTINGS
      if (!s.recordings || !s.recordings_digest || s.reminder_hour !== hour) continue
      const waiting = await deps.db.waitingSince(teacher, since)
      if (waiting.length === 0) continue
      if (!(await deps.db.claim('digest', `${teacher}:${pragueDay(deps.now)}`))) continue
      const pupils = new Set(waiting.map((w) => w.user_id)).size
      sent += await deliver(deps, [teacher], () => true, digestMessage(waiting.length, pupils))
    }
    // Storage nearly full: warn the owners of the largest files (once a day
    // at most, and the database sends no second warning before a clean-up).
    if (hour >= STORAGE_CHECK_HOUR && (await deps.db.claim('storage-check', pragueDay(deps.now)))) {
      const notice = await deps.db.autoCleanupNotice(STORAGE_LIMIT_BYTES)
      if (notice) {
        sent += await deliver(deps, notice.owners, () => true, largestFilesMessage(notice.noticeId, notice.deleteAfter))
      }
    }
    return { status: 200, body: { sent } }
  }

  const caller = await deps.userFromToken(bearer)
  if (!caller) return { status: 401, body: { error: 'unauthorized' } }

  if (request.type === 'test') {
    // At most one in TEST_EVERY_SECONDS.
    const slot = Math.floor(deps.now.getTime() / (TEST_EVERY_SECONDS * 1000))
    if (!(await deps.db.claim('test', `${caller}:${slot}`))) {
      return { status: 429, body: { error: 'too many' } }
    }
    return { status: 200, body: { sent: await deliver(deps, [caller], () => true, testMessage(deps.now)) } }
  }

  if (request.type === 'cleanup') {
    if (!(await deps.db.isModerator(caller))) return forbidden
    const notice = await deps.db.getCleanupNotice(request.noticeId)
    if (!notice || notice.kind !== 'all' || notice.created_by !== caller) return forbidden
    if (!(await deps.db.claim('cleanup', notice.id))) return { status: 200, body: { sent: 0 } }
    // Losing recordings matters more than the notification settings: to all.
    return { status: 200, body: { sent: await deliver(deps, await deps.db.allPupils(), () => true, cleanupMessage(notice)) } }
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
    // Teachers on the daily summary hear about it in the evening instead.
    return {
      status: 200,
      body: { sent: await deliver(deps, teachers, (s) => s.recordings && !s.recordings_digest, message) },
    }
  }

  if (request.type === 'message') {
    const message = await deps.db.getMessage(request.messageId)
    if (!message || message.teacher_id !== caller) return forbidden
    if (!(await deps.db.claim('message', message.id))) return { status: 200, body: { sent: 0 } }
    const text = pupilMessage(message, await deps.db.getName(message.teacher_id))
    // Same setting as assignments and announcements.
    return { status: 200, body: { sent: await deliver(deps, [message.student_id], (s) => s.assignments, text) } }
  }

  if (request.type === 'invite') {
    const invite = await deps.db.getInvite(request.inviteId)
    if (!invite || invite.invited_by !== caller) return forbidden
    if (!(await deps.db.claim('invite', invite.id))) return { status: 200, body: { sent: 0 } }
    const text = inviteMessage(invite, await deps.db.getName(caller))
    // Same setting as assignments and announcements.
    return { status: 200, body: { sent: await deliver(deps, [invite.student_id], (s) => s.assignments, text) } }
  }

  if (request.type === 'announcement') {
    const announcement = await deps.db.getAnnouncement(request.announcementId)
    if (!announcement || announcement.teacher_id !== caller) return forbidden
    if (!(await deps.db.claim('announcement', announcement.id))) return { status: 200, body: { sent: 0 } }
    const pupils = await deps.db.classroomMembers(announcement.classroom_id)
    const message = announcementMessage(announcement, await deps.db.getName(announcement.teacher_id))
    // Same setting as new assignments ("Nový úkol a oznámení").
    return { status: 200, body: { sent: await deliver(deps, pupils, (s) => s.assignments, message) } }
  }

  const assignment = await deps.db.getAssignment(request.assignmentId)
  if (!assignment || assignment.teacher_id !== caller) return forbidden
  if (!(await deps.db.claim('assignment', assignment.id))) return { status: 200, body: { sent: 0 } }
  const explicit = await deps.db.assignmentRecipients(assignment.id)
  const pupils = explicit.length > 0 ? explicit : await deps.db.classroomMembers(assignment.classroom_id)
  const message = assignmentMessage(assignment, await deps.db.getName(assignment.teacher_id))
  return { status: 200, body: { sent: await deliver(deps, pupils, (s) => s.assignments, message) } }
}
