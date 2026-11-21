import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import { setSoundsOn, soundsOn } from '../../lib/sounds'
import { SettingsRow } from '../../components/ui/SettingsRow'
import { Toast } from '../../components/ui/Toast'
import { AppShell } from '../../components/layout/AppShell'
import { ChangePasswordModal } from '../../components/ui/ChangePasswordModal'
import { NotificationsModal } from '../../components/ui/NotificationsModal'
import { InstallAppRow } from '../../components/ui/InstallAppRow'
import { ThemePicker } from '../../components/ui/ThemePicker'
import { useAuth } from '../../lib/AuthProvider'
import { signOut } from '../../lib/auth'
import { openDocs } from '../../lib/links'
import { ReportFormModal } from '../../components/ui/ReportFormModal'
import { useToast } from '../../lib/useToast'
import { updateShareBasicProgress } from '../../lib/data/profiles'
import { getErrorMessage } from '../../lib/errors'

// The pupil's settings: look, notifications, classes, password, privacy, help.
export function Settings() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const [sounds, setSounds] = useState(soundsOn)
  function toggleSounds(on: boolean) {
    setSoundsOn(on)
    setSounds(on)
  }
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [savingShare, setSavingShare] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  // "12/40" while the files download; undefined when idle.
  const [exporting, setExporting] = useState<string>()
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

  // Everything Muzio keeps about the pupil, as a ZIP (lib/exportMyData.ts).
  async function downloadData() {
    if (!profile) return
    setExporting('data')
    try {
      const { exportMyData } = await import('../../lib/data/myData')
      const zip = await exportMyData(profile, (done, total) => setExporting(`${done}/${total}`))
      const url = URL.createObjectURL(zip)
      const link = document.createElement('a')
      link.href = url
      link.download = `muzio-moje-data-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      show('Data jsou stažená')
    } catch (err) {
      show(getErrorMessage(err, 'Stažení dat se nepovedlo, zkus to znovu.'))
    } finally {
      setExporting(undefined)
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
        <div>
          {/* On a phone Settings is reached from Profile (no room in the bottom bar). */}
          <button
            type="button"
            className="md:hidden mb-1 text-sm text-text-muted"
            onClick={() => navigate('/student/profile')}
          >
            ← Profil
          </button>
          <h1 className="text-xl">Nastavení</h1>
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Aplikace</h2>
          <SettingsRow label="Vzhled" right={<ThemePicker />} />
          <SettingsRow label="Notifikace" onClick={() => setNotificationsOpen(true)} />
          <SettingsRow label="Zvuk při dokončení" right={<Switch checked={sounds} onChange={toggleSounds} />} />
          <InstallAppRow onInstalled={() => show('Muzio je na ploše')} />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Účet</h2>
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
            label={exporting ? `Stahuji ${exporting}…` : 'Stáhnout moje data'}
            right={<span className="text-xs text-text-muted">{exporting ? '⏳' : 'ZIP'}</span>}
            onClick={exporting ? undefined : () => void downloadData()}
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
            onClick={() => setReportOpen(true)}
          />
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
      {reportOpen && <ReportFormModal pupil onClose={() => setReportOpen(false)} />}
      {notificationsOpen && (
        <NotificationsModal role="student" userId={profile.id} onClose={() => setNotificationsOpen(false)} />
      )}
    </AppShell>
  )
}
