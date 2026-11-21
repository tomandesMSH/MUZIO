import { BadgeTile } from '../../components/gamification/BadgeTile'
import { PracticeCalendar } from '../../components/gamification/PracticeCalendar'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { NavIcon } from '../../components/layout/NavIcon'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchOwnLogsCount, fetchPracticeHistory, fetchWeeklyStats } from '../../lib/data/practiceLogs'
import { computeBadges, computeLevel, computeUnlockedSkins, isPerfectWeek } from '../../lib/game-logic'
import { countAwards, fetchAwardedBadges } from '../../lib/data/badges'

export function Profile() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const userId = profile?.id
  const [today] = useState(() => new Date())

  const history = useQuery(() => (userId ? fetchPracticeHistory(userId) : Promise.resolve([])), [userId])
  const logsCount = useQuery(
    () => (userId ? fetchOwnLogsCount(userId) : Promise.resolve(0)),
    [userId],
  )
  const weekly = useQuery(
    () => (userId ? fetchWeeklyStats(userId, today) : Promise.resolve({ dateKeys: [], weeklyCount: 0 })),
    [userId],
  )

  const awards = useQuery(() => (userId ? fetchAwardedBadges(userId) : Promise.resolve([])), [userId])

  if (!profile) return null

  const level = computeLevel(profile.xp ?? 0)
  const badges = computeBadges({
    stars: profile.stars,
    streak: profile.streak,
    totalRecordings: logsCount.data ?? 0,
    perfectWeek: weekly.data ? isPerfectWeek(weekly.data.dateKeys, today) : false,
    daysPlayedThisWeek: weekly.data?.dateKeys.length ?? 0,
    weeklyCount: weekly.data?.weeklyCount ?? 0,
    awardedCounts: countAwards(awards.data ?? []),
  })
  const skins = computeUnlockedSkins(level.level)

  return (
    <AppShell role="student">
      <div className="space-y-6 flex-1">
        <div className="relative text-center">
          {/* On a phone the bottom bar has no Settings - the gear is here. */}
          <button
            type="button"
            aria-label="Nastavení"
            title="Nastavení"
            onClick={() => navigate('/student/settings')}
            className="md:hidden absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-bg-card shadow-clay-sm text-text-muted hover:text-text-primary"
          >
            <NavIcon name="settings" className="w-5 h-5" />
          </button>
          <h1 className="text-xl">{profile.full_name}</h1>
          <p className="text-text-muted text-sm">
            Level {level.level} · {level.title}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <StatCard
            value={`🔥 ${profile.streak} dní`}
            label={
              profile.streak_freezes_available
                ? `Aktuální streak · 🧊${profile.streak_freezes_available}`
                : 'Aktuální streak'
            }
          />
          <StatCard value={`${profile.xp ?? 0}`} label="XP za ohodnocené nahrávky" />
          <StatCard value={`⭐ ${profile.stars}`} label="Hvězdy od učitele" />
          <StatCard value={`${logsCount.data ?? '-'}`} label="Odeslané nahrávky" />
        </div>

        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Kalendář cvičení</h2>
          <PracticeCalendar logs={history.data ?? []} />
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
              <BadgeTile key={badge.id} badge={badge} />
            ))}
          </ul>
        </div>

      </div>
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
