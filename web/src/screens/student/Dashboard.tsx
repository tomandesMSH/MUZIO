import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Toast } from '../../components/ui/Toast'
import { Streak } from '../../components/gamification/Streak'
import { XPDisplay } from '../../components/gamification/XPDisplay'
import { StarsDisplay } from '../../components/gamification/StarsDisplay'
import { LevelProgress } from '../../components/gamification/LevelProgress'
import { DailyReminderBanner } from '../../components/gamification/DailyReminderBanner'
import { Confetti } from '../../components/gamification/Confetti'
import { Quests } from '../../components/gamification/Quests'
import { Flames } from '../../components/gamification/Flames'
import { WorldProgress } from '../../components/world/WorldProgress'
import { LessonCard } from '../../components/lessons/LessonCard'
import { dueLabel, sortByDue } from '../../lib/dueDate'
import { AttachmentLink } from '../../components/lessons/AttachmentLink'
import { AppShell } from '../../components/layout/AppShell'
import { PendingUploads } from '../../components/audio/PendingUploads'
import { AnnouncementsCard } from '../../components/classrooms/AnnouncementsCard'
import { MailCard } from '../../components/classrooms/MailCard'
import { CleanupNoticeBanner } from '../../components/cleanup/CleanupNoticeBanner'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchCompletedAssignmentIds, fetchOwnLogsCount, fetchPracticeDayKeys, fetchWeeklyStats } from '../../lib/data/practiceLogs'
import { countPracticeDays, flameProgress } from '../../lib/flames'
import { detectFlameMilestone } from '../../lib/gamification/detectFlameMilestone'
import { playFanfare } from '../../lib/sounds'
import { fetchStudentAssignments, fetchStudentClassrooms } from '../../lib/data/classrooms'
import { weeklyGoalFor } from '../../lib/weeklyGoal'
import { WeeklyGoalCard } from '../../components/gamification/WeeklyGoalCard'
import { isPerfectWeek, hasPlayedToday, computeQuests } from '../../lib/game-logic'
import { detectNewUnlocks } from '../../lib/gamification/detectNewUnlocks'
import { countAwards, fetchAwardedBadges } from '../../lib/data/badges'
import { useToast } from '../../lib/useToast'
import type { Assignment } from '../../lib/data/types'

export function StudentDashboard() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const userId = profile?.id
  const [today] = useState(() => new Date())

  const logsCount = useQuery(
    () => (userId ? fetchOwnLogsCount(userId) : Promise.resolve(0)),
    [userId],
  )
  const weekly = useQuery(
    () => (userId ? fetchWeeklyStats(userId, today) : Promise.resolve({ dateKeys: [], weeklyCount: 0 })),
    [userId],
  )
  const dayKeys = useQuery(() => (userId ? fetchPracticeDayKeys(userId) : Promise.resolve([])), [userId])
  const awards = useQuery(() => (userId ? fetchAwardedBadges(userId) : Promise.resolve([])), [userId])
  const assignments = useQuery(() => fetchStudentAssignments(), [])
  const myClasses = useQuery(() => (userId ? fetchStudentClassrooms(userId).catch(() => []) : Promise.resolve([])), [userId])
  const assignmentIds = (assignments.data ?? []).map((a) => a.id)
  const completed = useQuery(
    () => (userId ? fetchCompletedAssignmentIds(userId, assignmentIds) : Promise.resolve(new Set<string>())),
    [userId, assignmentIds.join(',')],
  )

  const { message, show } = useToast()
  const [celebrating, setCelebrating] = useState(false)
  const celebratedRef = useRef(false)

  useEffect(() => {
    if (!userId || !profile || logsCount.data === undefined || !weekly.data || awards.loading) return
    if (celebratedRef.current) return
    celebratedRef.current = true

    const dateKeys = weekly.data.dateKeys
    const result = detectNewUnlocks(userId, profile.xp ?? 0, {
      stars: profile.stars,
      streak: profile.streak,
      totalRecordings: logsCount.data,
      perfectWeek: isPerfectWeek(dateKeys, today),
      daysPlayedThisWeek: dateKeys.length,
      weeklyCount: weekly.data.weeklyCount,
      awardedCounts: countAwards(awards.data ?? []),
    })

    if (result.newLevel) {
      setCelebrating(true)
      show(`Nový level: ${result.level}`)
      setTimeout(() => setCelebrating(false), 2500)
    } else if (result.newBadgeIds.length > 0) {
      setCelebrating(true)
      show('Máš nový odznak')
      setTimeout(() => setCelebrating(false), 2500)
    }
  }, [userId, profile, logsCount.data, weekly.data, awards.loading, awards.data, today, show])

  // A finished phase of the world (7, 14, 21, 28 flames): fanfare and confetti.
  useEffect(() => {
    if (!userId || !dayKeys.data) return
    const phase = detectFlameMilestone(userId, countPracticeDays(dayKeys.data))
    if (!phase) return
    playFanfare(phase)
    setCelebrating(true)
    show(phase === 4 ? 'Celý svět je hotový' : `Fáze ${phase} je hotová`)
    setTimeout(() => setCelebrating(false), 2500)
  }, [userId, dayKeys.data, show])

  if (!profile) return null

  const playedToday = weekly.data ? hasPlayedToday(weekly.data.dateKeys, today) : false
  const firstName = profile.full_name?.split(' ')[0] || 'žáku'
  const goal = weeklyGoalFor(myClasses.data ?? [])
  const quests = computeQuests({ playedToday, weeklyCount: weekly.data?.weeklyCount ?? 0 })

  function openAssignment(assignment: Assignment) {
    navigate('/student/recording', {
      state: {
        lessonTitle: assignment.title,
        instructions: assignment.description ?? '',
        assignmentId: assignment.id,
        attachmentPath: assignment.attachment_path ?? undefined,
        attachmentName: assignment.attachment_name ?? undefined,
      },
    })
  }

  return (
    <AppShell role="student">
      <Confetti active={celebrating} />
      {message && <Toast message={message} />}
      <div className="space-y-5">
        {/* Phone: greeting on its own line, the counters in a row under it. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl">Ahoj, {firstName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Streak count={profile.streak} freezesAvailable={profile.streak_freezes_available} />
            <XPDisplay xp={profile.xp ?? 0} />
            <StarsDisplay stars={profile.stars} />
          </div>
        </div>
        <CleanupNoticeBanner />
        {dayKeys.data && (
          <WorldProgress world={profile.world} progress={flameProgress(countPracticeDays(dayKeys.data))} />
        )}
        <MailCard studentId={profile.id} />
        <AnnouncementsCard />
        <PendingUploads
          userId={profile.id}
          onMessage={show}
          onSent={() => {
            refreshProfile()
            logsCount.refetch()
            weekly.refetch()
            dayKeys.refetch()
            completed.refetch()
          }}
        />
        <DailyReminderBanner playedToday={playedToday} onStart={() => navigate('/student/recording')} />

        <div>
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-2">Zadané lekce</h2>
          {assignments.loading && !assignments.data && <Skeleton rows={2} height="h-[72px]" />}
          {assignments.error && (
            <p className="text-sm text-coral-dark mb-2">
              Načtení úkolů se nepovedlo: {assignments.error.message}
            </p>
          )}
          <div className="space-y-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
            {sortByDue(assignments.data ?? [])
              // Still to do first, nearest deadline on top; done ones last.
              .sort((a, b) => Number(completed.data?.has(a.id) ?? false) - Number(completed.data?.has(b.id) ?? false))
              .map((assignment) => {
                const done = completed.data?.has(assignment.id) ?? false
                return (
                  <LessonCard
                    key={assignment.id}
                    icon="lessons"
                    title={assignment.title}
                    meta={assignment.description ?? ''}
                    teacherName={assignment.teacher_name}
                    badge={done ? { label: 'Hotovo', tone: 'success' } : { label: 'Čeká', tone: 'pending' }}
                    due={dueLabel(assignment.due_date, today, done)}
                    onClick={() => openAssignment(assignment)}
                    footer={assignment.attachment_path ? <AttachmentLink assignment={assignment} /> : undefined}
                  />
                )
              })}
          </div>
          {assignments.data?.length === 0 && (
            <p className="text-text-muted text-sm">Zatím nemáš žádný zadaný úkol.</p>
          )}
        </div>

        {dayKeys.data && (
          <Card>
            <Flames progress={flameProgress(countPracticeDays(dayKeys.data))} />
          </Card>
        )}

        <Card>
          <LevelProgress xp={profile.xp ?? 0} />
        </Card>

        {goal && <WeeklyGoalCard goal={goal} daysThisWeek={weekly.data?.dateKeys.length ?? 0} />}

        <Quests quests={quests} />
      </div>
    </AppShell>
  )
}
