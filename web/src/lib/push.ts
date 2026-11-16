// Web push on this device: the service worker (public/sw.js), turning
// notifications on and off, and asking the server (api/notify.ts) to send
// one after something happened. What to send is in notification_settings
// (migration 0035, lib/data/notificationSettings.ts).
import { supabase } from './supabase'
import { isRunningInstalled } from './install'
import { getErrorMessage } from './errors'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushSupport =
  | 'ready'
  // iPhone / iPad: only Muzio added to the home screen gets notifications.
  | 'needs-install'
  | 'unsupported'
  // The server keys aren't set up (VITE_VAPID_PUBLIC_KEY).
  | 'not-configured'

export function pushSupport(win: Window = window): PushSupport {
  const nav = win.navigator
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.userAgent.includes('Macintosh') && nav.maxTouchPoints > 1)
  if (ios && !isRunningInstalled(win)) return 'needs-install'
  if (!('serviceWorker' in nav) || !('PushManager' in win) || !('Notification' in win)) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  return 'ready'
}

export function registerServiceWorker(): void {
  if (import.meta.env.MODE === 'test' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // No notifications on this device; everything else works.
  })
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/sw.js')
}

// The VAPID key as the bytes PushManager wants.
export function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// Is this device subscribed (for the signed-in user - see enablePush)?
export async function isPushEnabled(): Promise<boolean> {
  if (pushSupport() !== 'ready' || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return !!(await reg?.pushManager.getSubscription())
}

export type EnableResult = 'enabled' | 'denied'

export async function enablePush(userId: string): Promise<EnableResult> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const reg = await registration()
  // Always a fresh subscription: on a shared computer the old one may belong
  // to someone who signed in here before.
  await (await reg.pushManager.getSubscription())?.unsubscribe()
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY!),
  })
  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').insert({
    endpoint: subscription.endpoint,
    user_id: userId,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  })
  if (error) {
    await subscription.unsubscribe()
    throw error
  }
  return 'enabled'
}

// Off on this device. Also called on sign-out, so the next person on a shared
// computer doesn't get your notifications.
export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

export type NotifyEvent =
  | { type: 'graded'; logId: string }
  | { type: 'recording'; logId: string }
  | { type: 'assignment'; assignmentId: string }
  | { type: 'test' }

// Asks the server to send the notification for something that just happened.
// Best effort: a failure never gets in the way of what the user was doing.
export function notifyPush(event: NotifyEvent): void {
  if (import.meta.env.MODE === 'test') return
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(event),
        keepalive: true,
      })
    } catch {
      // Offline, or the function isn't deployed (local dev): no notification.
    }
  })()
}

// "Registration failed - push service error" (AbortError): the browser
// couldn't reach its own push service (Google's for Chrome, Microsoft's for
// Edge) - nothing Muzio can fix, but the user can.
export function pushErrorText(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if ((err instanceof DOMException && err.name === 'AbortError') || /push service/i.test(message)) {
    return 'Prohlížeč se nespojil se svou službou pro notifikace. V Brave zapni Nastavení → Soukromí a zabezpečení → „Použít služby Google pro zasílání push zpráv“ a restartuj ho. Jinak to může blokovat VPN, firewall nebo blokátor reklam – nebo zkus Chrome či Edge.'
  }
  return getErrorMessage(err, 'Nepovedlo se to, zkus to znovu.')
}
