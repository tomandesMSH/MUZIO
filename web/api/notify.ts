// POST /api/notify - sends the push notifications (see migration 0035 and
// api/_lib/notify-core.ts for what goes to whom).
//
// Vercel environment variables:
//   SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//   VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET (the same value as
//   the muzio_cron_secret in Supabase Vault), optionally VAPID_SUBJECT.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import {
  DEFAULT_SETTINGS,
  handleNotify,
  parseRequest,
  type Db,
  type Settings,
  type Subscription,
} from './_lib/notify-core.js'

function supabaseDb(url: string, serviceKey: string) {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids = (rows: { [k: string]: unknown }[] | null, key: string) => (rows ?? []).map((r) => String(r[key]))

  const db: Db = {
    async getLog(id) {
      const { data } = await sb
        .from('practice_logs')
        .select('id, user_id, rating, graded_by, assignment_id, duration_seconds')
        .eq('id', id)
        .maybeSingle()
      return data
    },
    async getAssignment(id) {
      const { data } = await sb.from('assignments').select('id, teacher_id, classroom_id, title').eq('id', id).maybeSingle()
      return data
    },
    async getAnnouncement(id) {
      const { data } = await sb
        .from('classroom_announcements')
        .select('id, classroom_id, teacher_id, body')
        .eq('id', id)
        .maybeSingle()
      return data
    },
    async getName(userId) {
      const { data } = await sb.from('profiles').select('full_name').eq('id', userId).maybeSingle()
      return data?.full_name ?? null
    },
    async assignmentRecipients(assignmentId) {
      const { data } = await sb.from('assignment_recipients').select('student_id').eq('assignment_id', assignmentId)
      return ids(data, 'student_id')
    },
    async classroomMembers(classroomId) {
      const { data } = await sb.from('classroom_members').select('student_id').eq('classroom_id', classroomId)
      return ids(data, 'student_id')
    },
    async teachersOf(studentId) {
      const { data } = await sb.from('classroom_members').select('classrooms(teacher_id)').eq('student_id', studentId)
      return (data ?? []).flatMap((row) => {
        const c = row.classrooms as unknown as { teacher_id: string } | { teacher_id: string }[] | null
        return (Array.isArray(c) ? c : c ? [c] : []).map((x) => x.teacher_id)
      })
    },
    async settings(userIds) {
      const map = new Map<string, Settings>()
      if (userIds.length === 0) return map
      const { data } = await sb.from('notification_settings').select('*').in('user_id', userIds)
      for (const row of data ?? []) map.set(row.user_id, { ...DEFAULT_SETTINGS, ...row })
      return map
    },
    async subscriptions(userIds) {
      if (userIds.length === 0) return []
      const { data } = await sb.from('push_subscriptions').select('endpoint, user_id, p256dh, auth').in('user_id', userIds)
      return (data ?? []) as Subscription[]
    },
    async deleteSubscription(endpoint) {
      await sb.from('push_subscriptions').delete().eq('endpoint', endpoint)
    },
    async autoCleanupNotice(limitBytes) {
      const { data, error } = await sb.rpc('auto_cleanup_notice', { p_limit_bytes: limitBytes })
      if (error) throw error
      const rows = (data ?? []) as { notice_id: string; user_id: string }[]
      if (rows.length === 0) return null
      const { data: notice } = await sb.from('cleanup_notices').select('delete_after').eq('id', rows[0].notice_id).single()
      return {
        noticeId: rows[0].notice_id,
        deleteAfter: notice?.delete_after as string,
        owners: [...new Set(rows.map((r) => r.user_id))],
      }
    },
    async reminderCandidates() {
      const { data: subs } = await sb.from('push_subscriptions').select('user_id')
      const userIds = [...new Set(ids(subs, 'user_id'))]
      if (userIds.length === 0) return []
      const { data } = await sb
        .from('profiles')
        .select('id, streak, last_practice_date')
        .in('id', userIds)
        .eq('role', 'student')
        .eq('is_banned', false)
      return (data ?? []).map((p) => ({ user_id: p.id, streak: p.streak ?? 0, last_practice_date: p.last_practice_date }))
    },
    async dueOn(day) {
      const { data: assignments } = await sb
        .from('assignments')
        .select('id, teacher_id, classroom_id, title')
        .eq('due_date', day)
      const result = []
      for (const assignment of assignments ?? []) {
        const [{ data: chosen }, { data: members }, { data: logs }] = await Promise.all([
          sb.from('assignment_recipients').select('student_id').eq('assignment_id', assignment.id),
          sb.from('classroom_members').select('student_id').eq('classroom_id', assignment.classroom_id),
          sb.from('practice_logs').select('user_id').eq('assignment_id', assignment.id),
        ])
        const pupils = (chosen ?? []).length > 0 ? ids(chosen, 'student_id') : ids(members, 'student_id')
        const sent = new Set(ids(logs, 'user_id'))
        result.push({ assignment, missing: pupils.filter((p) => !sent.has(p)) })
      }
      return result
    },
    async digestTeachers() {
      const { data: subs } = await sb.from('push_subscriptions').select('user_id')
      const userIds = [...new Set(ids(subs, 'user_id'))]
      if (userIds.length === 0) return []
      const { data } = await sb
        .from('notification_settings')
        .select('user_id')
        .in('user_id', userIds)
        .eq('recordings_digest', true)
      return ids(data, 'user_id')
    },
    async waitingSince(teacherId, sinceIso) {
      const { data: classes } = await sb.from('classrooms').select('id').eq('teacher_id', teacherId)
      const classIds = ids(classes, 'id')
      if (classIds.length === 0) return []
      const { data: members } = await sb.from('classroom_members').select('student_id').in('classroom_id', classIds)
      const pupils = [...new Set(ids(members, 'student_id'))]
      if (pupils.length === 0) return []
      const { data } = await sb
        .from('practice_logs')
        .select('user_id')
        .in('user_id', pupils)
        .is('teacher_comment', null)
        .gte('created_at', sinceIso)
      return (data ?? []) as { user_id: string }[]
    },
    async claim(kind, ref) {
      const { error } = await sb.from('push_sent').insert({ kind, ref })
      // 23505 = already there: sent before.
      if (error && error.code !== '23505') throw error
      return !error
    },
  }
  return { sb, db }
}

export async function POST(request: Request): Promise<Response> {
  const env = process.env
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = env.VITE_VAPID_PUBLIC_KEY
  const privateKey = env.VAPID_PRIVATE_KEY
  if (!url || !serviceKey || !publicKey || !privateKey) {
    return Response.json({ error: 'notifications not configured' }, { status: 503 })
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT ?? 'mailto:tomandes@tuta.io', publicKey, privateKey)

  const { sb, db } = supabaseDb(url, serviceKey)
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? null
  const body = await request.json().catch(() => null)

  const result = await handleNotify(parseRequest(body), bearer, {
    db,
    cronSecret: env.CRON_SECRET,
    now: new Date(),
    async userFromToken(token) {
      const { data } = await sb.auth.getUser(token)
      return data.user?.id ?? null
    },
    async send(subscription, message) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(message),
          { TTL: 12 * 60 * 60 },
        )
        return 'ok'
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        return status === 404 || status === 410 ? 'gone' : 'failed'
      }
    },
  })
  return Response.json(result.body, { status: result.status })
}
