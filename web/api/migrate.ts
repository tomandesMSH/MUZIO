// POST /api/migrate - Migrace z Base44 (see api/_lib/migrate-core.ts and
// migration 0055). No sign-in: the pupil proves the e-mail with the code.
//
// Vercel environment variables:
//   SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//   RESEND_API_KEY, MIGRATION_FROM (e.g. "Muzio <muzio@tomandes.eu>", a
//   sender on a domain verified in Resend).
import { createClient } from '@supabase/supabase-js'
import { handleMigrate, parseMigrateRequest, type MigrateDeps } from './_lib/migrate-core.js'

function codeEmail(code: string): { subject: string; text: string; html: string } {
  const text = [
    `Tvůj kód pro přenos dat z Base44 do Muzia: ${code}`,
    '',
    'Platí 15 minut. Zadej ho v Muziu na obrazovce Migrace a vyber si uživatelské jméno a heslo.',
    'Pokud jsi o kód nežádal(a), tento e-mail ignoruj.',
  ].join('\n')
  const html = `<p>Tvůj kód pro přenos dat z Base44 do Muzia:</p>
<p style="font-size:28px;font-weight:600;letter-spacing:4px;font-family:monospace">${code}</p>
<p>Platí 15 minut. Zadej ho v Muziu na obrazovce Migrace a vyber si uživatelské jméno a heslo.</p>
<p style="color:#777">Pokud jsi o kód nežádal(a), tento e-mail ignoruj.</p>`
  return { subject: `Muzio: kód ${code}`, text, html }
}

export async function POST(request: Request): Promise<Response> {
  const env = process.env
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = env.RESEND_API_KEY
  const from = env.MIGRATION_FROM
  if (!url || !serviceKey || !resendKey || !from) {
    return Response.json({ error: 'Migrace zatím není nastavená.' }, { status: 503 })
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const deps: MigrateDeps = {
    now: new Date(),
    async findImport(hash) {
      const { data, error } = await sb.from('base44_import').select('claimed_by').eq('email_hash', hash).maybeSingle()
      if (error) throw error
      if (!data) return false
      return data.claimed_by ? 'claimed' : true
    },
    async getCode(hash) {
      const { data, error } = await sb.from('migration_codes').select('*').eq('email_hash', hash).maybeSingle()
      if (error) throw error
      return data
    },
    async saveCode(row) {
      const { error } = await sb.from('migration_codes').upsert(row)
      if (error) throw error
    },
    async deleteCode(hash) {
      await sb.from('migration_codes').delete().eq('email_hash', hash)
    },
    async sendCode(to, code) {
      const mail = codeEmail(code)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
      })
      if (!response.ok) throw new Error(`Resend ${response.status}`)
    },
    async createUser({ email, password, fullName, dateOfBirth }) {
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'student', date_of_birth: dateOfBirth },
      })
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return 'taken'
        throw error
      }
      return data.user.id
    },
    async finishProfile(userId, consent) {
      const { error } = await sb
        .from('profiles')
        .update({
          date_of_birth: consent.dateOfBirth,
          consent_given: true,
          consent_guardian_name: consent.guardianName,
          consent_given_at: new Date().toISOString(),
          is_approved: true,
        })
        .eq('id', userId)
      if (error) throw error
    },
    async deleteUser(userId) {
      await sb.auth.admin.deleteUser(userId)
    },
    async applyImport(userId, hash) {
      const { data, error } = await sb.rpc('apply_base44_import', { p_user: userId, p_email_hash: hash })
      if (error) throw error
      const d = data as { flames: number; stars: number; badges: number }
      return { flames: Number(d.flames), stars: Number(d.stars), badges: Number(d.badges) }
    },
  }

  const body = await request.json().catch(() => null)
  try {
    const result = await handleMigrate(parseMigrateRequest(body), deps)
    return Response.json(result.body, { status: result.status })
  } catch {
    return Response.json({ error: 'Něco se nepovedlo, zkus to prosím za chvíli znovu.' }, { status: 500 })
  }
}
