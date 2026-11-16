import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SettingsRow } from '../../components/ui/SettingsRow'
import { openDocs } from '../../lib/links'
import { Badge } from '../../components/ui/Badge'
import { Toast } from '../../components/ui/Toast'
import { ChangePasswordModal } from '../../components/ui/ChangePasswordModal'
import { NotificationsModal } from '../../components/ui/NotificationsModal'
import { InstallAppRow } from '../../components/ui/InstallAppRow'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../lib/AuthProvider'
import { signOut } from '../../lib/auth'
import { ThemePicker } from '../../components/ui/ThemePicker'
import { useToast } from '../../lib/useToast'

export function Profile() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [passwordOpen, setPasswordOpen] = useState(false)
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
        <div className="text-center">
          <h1 className="text-xl">{profile.full_name}</h1>
          <p className="text-text-muted text-sm">Učitel</p>
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Nastavení</h2>
          <SettingsRow label="Vzhled" right={<ThemePicker />} />
          <SettingsRow
            label="Ověření identity"
            right={
              profile.is_verified ? (
                <Badge tone="success">Ověřeno</Badge>
              ) : (
                <Badge tone="pending">Čeká na ověření</Badge>
              )
            }
          />
          <SettingsRow label="Změnit heslo" onClick={() => setPasswordOpen(true)} />
          <InstallAppRow onInstalled={() => show('Muzio je na ploše 🎉')} />
          <SettingsRow label="Notifikace" onClick={() => setNotificationsOpen(true)} />
          <SettingsRow label="📖 Dokumentace" onClick={openDocs} />
        </div>

        {profile.is_moderator && (
          <div>
            <h2 className="text-sm font-heading font-semibold mb-1">Moderace</h2>
            <SettingsRow label="Nahlášený obsah" onClick={() => navigate('/moderator')} />
          </div>
        )}

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
