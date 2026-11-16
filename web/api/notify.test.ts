import { afterEach, describe, expect, it } from 'vitest'
import webpush from 'web-push'
import { POST } from './notify.js'

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request('https://muzio.test/api/notify', { method: 'POST', body: JSON.stringify(body), headers }))

describe('POST /api/notify', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('503 until the keys are set in Vercel', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await post({ type: 'test' })).status).toBe(503)
  })

  it('401 without a sign-in or the cron secret', async () => {
    const keys = webpush.generateVAPIDKeys()
    Object.assign(process.env, {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      VITE_VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY: keys.privateKey,
      CRON_SECRET: 'secret',
    })
    expect((await post({ type: 'test' })).status).toBe(401)
    expect((await post({ type: 'reminders' }, { Authorization: 'Bearer wrong' })).status).toBe(401)
    expect((await post({ type: 'nonsense' }, { Authorization: 'Bearer x' })).status).toBe(400)
  })
})
