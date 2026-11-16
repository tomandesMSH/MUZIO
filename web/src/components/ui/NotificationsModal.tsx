import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Switch } from './Switch'
import { disablePush, enablePush, isPushEnabled, notifyPush, pushErrorText, pushSupport } from '../../lib/push'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  REMINDER_HOURS,
  fetchNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from '../../lib/data/notificationSettings'
import { getErrorMessage } from '../../lib/errors'

interface NotificationsModalProps {
  role: 'student' | 'teacher'
  userId: string
  onClose: () => void
}

const SUPPORT_TEXT = {
  'needs-install':
    'Na iPhonu a iPadu chodí notifikace jen do Muzia přidaného na plochu: v Safari klepni na Sdílet → Přidat na plochu, otevři Muzio z plochy a zapni je tam.',
  unsupported: 'Tenhle prohlížeč notifikace neumí. Zkus Chrome, Edge, Firefox nebo Safari.',
  'not-configured': 'Notifikace ještě nejsou na serveru nastavené.',
}

// Profile > Notifikace. Mount only while open.
export function NotificationsModal({ role, userId, onClose }: NotificationsModalProps) {
  const support = pushSupport()
  const [enabled, setEnabled] = useState<boolean>()
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  const [error, setError] = useState<string>()
  // A change made before the saved settings arrived wins over them.
  const touched = useRef(false)

  useEffect(() => {
    let cancelled = false
    isPushEnabled()
      .then((on) => !cancelled && setEnabled(on))
      .catch(() => !cancelled && setEnabled(false))
    fetchNotificationSettings(userId)
      .then((s) => !cancelled && !touched.current && setSettings(s))
      .catch(() => {
        // Defaults stay; saving will say if something's wrong.
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function toggleDevice(next: boolean) {
    setBusy(true)
    setError(undefined)
    setNote(undefined)
    try {
      if (next) {
        const result = await enablePush(userId)
        if (result === 'denied') {
          setError('Prohlížeč notifikace nepovolil. Povol je v nastavení webu (ikona zámku vedle adresy) a zkus to znovu.')
          return
        }
        setEnabled(true)
      } else {
        await disablePush()
        setEnabled(false)
      }
    } catch (err) {
      setError(pushErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function update(patch: Partial<NotificationSettings>) {
    touched.current = true
    const next = { ...settings, ...patch }
    const previous = settings
    setSettings(next)
    setError(undefined)
    try {
      await saveNotificationSettings(userId, next)
    } catch (err) {
      setSettings(previous)
      setError(getErrorMessage(err, 'Nastavení se nepodařilo uložit.'))
    }
  }

  function sendTest() {
    notifyPush({ type: 'test' })
    setNote('Zkušební notifikace je na cestě – měla by přijít do pár vteřin.')
  }

  const row = (label: string, hint: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-text-muted">{hint}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg">Notifikace</h2>

        {support === 'ready' ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Na tomhle zařízení</div>
              <div className="text-xs text-text-muted">
                {enabled ? 'Zapnuté – notifikace sem chodí.' : 'Vypnuté. Zapni je na každém telefonu či počítači zvlášť.'}
              </div>
            </div>
            <Switch checked={!!enabled} onChange={toggleDevice} disabled={busy || enabled === undefined} />
          </div>
        ) : (
          <p className="rounded-xl border border-border p-3 text-sm">{SUPPORT_TEXT[support]}</p>
        )}

        <div>
          <div className="text-xs font-semibold text-text-muted mb-1">Co posílat (platí pro všechna tvoje zařízení)</div>
          <div className="divide-y divide-border">
            {role === 'student' ? (
              <>
                {row('Ohodnocená nahrávka', 'Když učitel ohodnotí tvou nahrávku.', settings.graded, (v) => update({ graded: v }))}
                {row('Nový úkol', 'Když ti učitel zadá úkol.', settings.assignments, (v) => update({ assignments: v }))}
                {row('Připomínka cvičení', 'Večer, když jsi ten den ještě necvičil(a).', settings.reminder, (v) =>
                  update({ reminder: v }),
                )}
                {settings.reminder && (
                  <div className="py-2">
                    <div className="text-xs text-text-muted mb-1.5">V kolik hodin</div>
                    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Čas připomínky">
                      {REMINDER_HOURS.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          role="radio"
                          aria-checked={settings.reminder_hour === hour}
                          onClick={() => update({ reminder_hour: hour })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-heading font-semibold transition ${
                            settings.reminder_hour === hour
                              ? 'bg-coral text-white shadow-clay-sm'
                              : 'bg-bg-card-alt text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {hour}:00
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              row('Nová nahrávka', 'Když ti žák pošle nahrávku k ohodnocení.', settings.recordings, (v) =>
                update({ recordings: v }),
              )
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        )}
        {note && <p className="text-sm text-text-muted">{note}</p>}

        <div className="flex gap-2.5">
          {enabled && (
            <Button type="button" variant="ghost" className="flex-1" onClick={sendTest}>
              Poslat zkušební
            </Button>
          )}
          <Button type="button" className="flex-1" onClick={onClose}>
            Hotovo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
