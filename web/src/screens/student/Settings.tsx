import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import { SettingsRow } from '../../components/ui/SettingsRow'
import { Toast } from '../../components/ui/Toast'
import { AppShell } from '../../components/layout/AppShell'
import { JoinClassroomModal } from '../../components/classrooms/JoinClassroomModal'
import { ChangePasswordModal } from '../../components/ui/ChangePasswordModal'
import { NotificationsModal } from '../../components/ui/NotificationsModal'
import { InstallAppRow } from '../../components/ui/InstallAppRow'
import { ThemePicker } from '../../components/ui/ThemePicker'
import { useAuth } from '../../lib/AuthProvider'
import { signOut } from '../../lib/auth'
import { openDocs } from '../../lib/links'
import { reportFormUrl } from '../../lib/report'
import { useToast } from '../../lib/useToast'
import { updateShareBasicProgress } from '../../lib/data/profiles'
import { getErrorMessage } from '../../lib/errors'

// The pupil's settings: look, notifications, classes, password, privacy, help.
export function Settings() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const [pairingOpen, setPairingOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [savingShare, setSavingShare] = useState(false)
  const { message, show } = useToast()

  if (!profile) return null

  async function toggleShareBasicProgress(next: boolean) {
    if (!profile) return
    setSavingShare(true)
    try {
      await updateShareBasicProgress(profile.id, next)
      refreshProfile()
    } catch (err) {
      show(getErrorMessage(err, 'Uložení se nepovedlo, zkus to znovu.'))
    } finally {
      setSavingShare(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell role="student">
      {message && <Toast message={message} />}
      <div className="space-y-6 flex-1">
        <h1 className="text-xl">Nastavení</h1>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Aplikace</h2>
          <SettingsRow label="Vzhled" right={<ThemePicker />} />
          <SettingsRow label="Notifikace" onClick={() => setNotificationsOpen(true)} />
          <InstallAppRow onInstalled={() => show('Muzio je na ploše 🎉')} />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Účet</h2>
          <SettingsRow label="Moje třídy" onClick={() => setPairingOpen(true)} />
          <SettingsRow label="Změnit heslo" onClick={() => setPasswordOpen(true)} />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Ochrana osobních údajů</h2>
          <SettingsRow
            label="Sdílet učiteli i samostatné procvičování"
            right={
              <Switch checked={!!profile.share_basic_progress} onChange={toggleShareBasicProgress} disabled={savingShare} />
            }
          />
          <SettingsRow
            label="Souhlas se zpracováním"
            right={
              <span className="text-xs text-text-muted">
                {profile.consent_given
                  ? profile.consent_guardian_name
                    ? `Uděleno (${profile.consent_guardian_name})`
                    : 'Uděleno'
                  : 'Chybí'}
              </span>
            }
          />
          <SettingsRow
            label="Smazání osobních údajů"
            onClick={() => show('Pro smazání účtu a všech nahrávek požádej svého učitele.')}
          />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Nápověda</h2>
          <SettingsRow label="Dokumentace" onClick={openDocs} />
          <SettingsRow
            label="Nahlásit problém nebo nápad"
            onClick={() => window.open(reportFormUrl({ pupil: true }), '_blank', 'noopener,noreferrer')}
          />
        </div>

        <Button variant="ghost" className="w-full" onClick={handleLogout}>
          Odhlásit se
        </Button>
      </div>
      <JoinClassroomModal open={pairingOpen} onClose={() => setPairingOpen(false)} />
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
        <NotificationsModal role="student" userId={profile.id} onClose={() => setNotificationsOpen(false)} />
      )}
    </AppShell>
  )
}
