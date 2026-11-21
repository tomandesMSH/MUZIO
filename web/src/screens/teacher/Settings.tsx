import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { SettingsRow } from '../../components/ui/SettingsRow'
import { Toast } from '../../components/ui/Toast'
import { ChangePasswordModal } from '../../components/ui/ChangePasswordModal'
import { NotificationsModal } from '../../components/ui/NotificationsModal'
import { InstallAppRow } from '../../components/ui/InstallAppRow'
import { ThemePicker } from '../../components/ui/ThemePicker'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../lib/AuthProvider'
import { signOut } from '../../lib/auth'
import { openDocs } from '../../lib/links'
import { WhatsNewModal } from '../../components/ui/WhatsNew'
import { useToast } from '../../lib/useToast'

// The teacher's settings: look, notifications, password, moderation, help.
export function Settings() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { message, show } = useToast()

  if (!profile) return null

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell role="teacher">
      {message && <Toast message={message} />}
      <div className="space-y-6 flex-1">
        <h1 className="text-xl">Nastavení</h1>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Aplikace</h2>
          <SettingsRow label="Vzhled" right={<ThemePicker />} />
          <SettingsRow label="Notifikace" onClick={() => setNotificationsOpen(true)} />
          <InstallAppRow onInstalled={() => show('Muzio je na ploše')} />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Účet</h2>
          <SettingsRow label="Změnit heslo" onClick={() => setPasswordOpen(true)} />
        </div>

        {profile.is_moderator && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-1">Moderace</h2>
            <SettingsRow label="Nahlášený obsah" onClick={() => navigate('/moderator')} />
          </div>
        )}

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Nápověda</h2>
          <SettingsRow label="Dokumentace" onClick={openDocs} />
          <SettingsRow label="Co je nového" onClick={() => setNewsOpen(true)} />
          <WhatsNewModal role="teacher" open={newsOpen} onClose={() => setNewsOpen(false)} />
        </div>

        <Button variant="ghost" className="w-full" onClick={handleLogout}>
          Odhlásit se
        </Button>
      </div>
      {passwordOpen && (
        <ChangePasswordModal
          onClose={() => setPasswordOpen(false)}
          onChanged={() => {
            setPasswordOpen(false)
            show('Heslo je změněné.')
          }}
        />
      )}
      {notificationsOpen && (
        <NotificationsModal role="teacher" userId={profile.id} onClose={() => setNotificationsOpen(false)} />
      )}
    </AppShell>
  )
}
