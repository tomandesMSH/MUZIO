import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import { SettingsRow } from '../../components/ui/SettingsRow'
import { Toast } from '../../components/ui/Toast'
import { AppShell } from '../../components/layout/AppShell'
import { JoinClassroomModal } from '../../components/classrooms/JoinClassroomModal'
import { ChangePasswordModal } from '../../components/ui/ChangePasswordModal'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchOwnLogsCount, fetchWeeklyStats } from '../../lib/data/practiceLogs'
import { computeBadges, computeLevel, computeUnlockedSkins, isPerfectWeek } from '../../lib/game-logic'
import { signOut } from '../../lib/auth'
import { applyTheme, getStoredTheme } from '../../lib/theme'
import { useToast } from '../../lib/useToast'
import { updateShareBasicProgress } from '../../lib/data/profiles'
import { getErrorMessage } from '../../lib/errors'
import { reportFormUrl } from '../../lib/report'

export function Profile() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const userId = profile?.id
  const [today] = useState(() => new Date())
  const [darkMode, setDarkMode] = useState(() => getStoredTheme() === 'dark')
  const [pairingOpen, setPairingOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [savingShare, setSavingShare] = useState(false)
  const { message, show } = useToast()

  const logsCount = useQuery(
    () => (userId ? fetchOwnLogsCount(userId) : Promise.resolve(0)),
    [userId],
  )
  const weekly = useQuery(
    () => (userId ? fetchWeeklyStats(userId, today) : Promise.resolve({ dateKeys: [], weeklyCount: 0 })),
    [userId],
  )

  if (!profile) return null

  const level = computeLevel(logsCount.data ?? 0)
  const badges = computeBadges({
    stars: profile.stars,
    streak: profile.streak,
    totalRecordings: logsCount.data ?? 0,
    perfectWeek: weekly.data ? isPerfectWeek(weekly.data.dateKeys, today) : false,
    daysPlayedThisWeek: weekly.data?.dateKeys.length ?? 0,
    weeklyCount: weekly.data?.weeklyCount ?? 0,
  })
  const skins = computeUnlockedSkins(level.level)

  function toggleDarkMode(next: boolean) {
    setDarkMode(next)
    applyTheme(next ? 'dark' : 'light')
  }

  function openReportForm() {
    window.open(reportFormUrl({ pupil: true }), '_blank', 'noopener,noreferrer')
  }

  function notReady() {
    show('Tahle funkce se ještě připravuje.')
  }

  async function toggleShareBasicProgress(next: boolean) {
    if (!userId) return
    setSavingShare(true)
    try {
      await updateShareBasicProgress(userId, next)
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
        <div className="text-center">
          <h1 className="text-xl">{profile.full_name}</h1>
          <p className="text-text-muted text-sm">
            Level {level.level} · {level.title}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <StatCard
            value={`${profile.streak} dní`}
            label={
              profile.streak_freezes_available
                ? `Aktuální streak · 🧊${profile.streak_freezes_available}`
                : 'Aktuální streak'
            }
          />
          <StatCard value={String(profile.stars)} label="Celkem XP" />
          <StatCard value={String(logsCount.data ?? '-')} label="Dokončené nahrávky" />
          <StatCard value={String(weekly.data?.weeklyCount ?? '-')} label="Tento týden" />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Maskot</h2>
          <div className="flex gap-2 flex-wrap">
            {skins.map((skin) => (
              <span key={skin.id} title={skin.label} className="text-2xl">
                {skin.icon}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Odznaky</h2>
          {/* Name and how to earn it are written out - a hover tooltip never shows on a phone. */}
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {badges.map((badge) => (
              <li
                key={badge.id}
                className={`rounded-2xl p-3 flex items-start gap-2.5 ${
                  badge.unlocked ? 'bg-bg-card shadow-clay-sm' : 'bg-bg-card-alt'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`shrink-0 w-9 h-9 rounded-full bg-bg-card shadow-clay-sm flex items-center justify-center text-base ${
                    badge.unlocked ? '' : 'grayscale opacity-50'
                  }`}
                >
                  {badge.icon}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-heading font-semibold ${badge.unlocked ? '' : 'text-text-muted'}`}>
                    {badge.label}
                  </div>
                  <div className="text-[11px] leading-snug text-text-muted">{badge.description}</div>
                  <div className="text-[11px] font-semibold mt-0.5 text-text-muted">
                    {badge.unlocked ? '✓ Získáno' : badge.progressLabel}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-1">Nastavení</h2>
          <SettingsRow label="Tmavý režim" right={<Switch checked={darkMode} onChange={toggleDarkMode} />} />
          <SettingsRow label="Notifikace" onClick={notReady} />
          <SettingsRow label="Moje třídy" onClick={() => setPairingOpen(true)} />
          <SettingsRow label="Změnit heslo" onClick={() => setPasswordOpen(true)} />
          <SettingsRow label="Nahlásit problém nebo nápad" onClick={openReportForm} />
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
    </AppShell>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5">
      <div className="font-heading font-bold text-lg mb-0.5">{value}</div>
      <div className="text-text-muted text-xs">{label}</div>
    </div>
  )
}
