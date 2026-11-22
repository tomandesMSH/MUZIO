// Pure, framework-free gamification helpers.

export const LEVEL_TITLES = [
  'Nováček',
  'Začátečník',
  'Talent',
  'Šikovný hráč',
  'Mistr kláves',
  'Virtuoz',
  'Legenda',
] as const

// XP for one recording: minutes (rounded up, 1 to 5) x the teacher's rating
// (1-5), 0 until it's graded; no known length counts as 1 minute. The real
// number is computed in the database (xp_for_log, migration 0024) - this copy
// only previews it, so keep the two in sync.
export const XP_MAX_MINUTES = 5

export function xpMinutes(durationSeconds: number | null | undefined): number {
  const seconds = durationSeconds ?? 60
  return Math.min(Math.max(Math.ceil(seconds / 60), 1), XP_MAX_MINUTES)
}

export function xpForLog(rating: number | null | undefined, durationSeconds: number | null | undefined): number {
  if (!rating || rating < 1) return 0
  return xpMinutes(durationSeconds) * Math.min(rating, 5)
}

// The level comes from XP, i.e. from practice the teacher has graded. Stars
// are a separate award from the teacher and don't move it.
// Every level costs a little more than the one before: 25 XP to level 2,
// 30 more to level 3, 35 more to level 4...
export const XP_FIRST_LEVEL = 25
export const XP_LEVEL_STEP = 5

// XP needed to get from `level` to the next one.
export function levelCost(level: number): number {
  return XP_FIRST_LEVEL + XP_LEVEL_STEP * (Math.max(1, level) - 1)
}

// Total XP at which `level` starts (level 1 = 0).
export function levelStartXp(level: number): number {
  const n = Math.max(1, level) - 1
  return n * XP_FIRST_LEVEL + (XP_LEVEL_STEP * n * (n - 1)) / 2
}

export interface LevelInfo {
  level: number
  title: string
  xpInLevel: number
  // XP the current level takes in all.
  levelXp: number
  xpToNext: number
  progress: number
}

export function computeLevel(xp: number | undefined): LevelInfo {
  const safeCount = Math.max(0, xp || 0)
  let level = 1
  while (levelStartXp(level + 1) <= safeCount) level++
  const titleIndex = Math.min(level - 1, LEVEL_TITLES.length - 1)
  let title: string = LEVEL_TITLES[titleIndex]
  if (level > LEVEL_TITLES.length) {
    title = `${LEVEL_TITLES[LEVEL_TITLES.length - 1]} +${level - LEVEL_TITLES.length}`
  }
  const levelXp = levelCost(level)
  const xpInLevel = safeCount - levelStartXp(level)
  return {
    level,
    title,
    xpInLevel,
    levelXp,
    xpToNext: levelXp - xpInLevel,
    progress: xpInLevel / levelXp,
  }
}

export interface BadgeContext {
  stars?: number
  streak?: number
  totalRecordings?: number
  perfectWeek?: boolean
  daysPlayedThisWeek?: number
  weeklyCount?: number
  // How many times the teacher awarded each hand-given badge (migration 0025).
  awardedCounts?: Partial<Record<TeacherBadgeId, number>>
}

// Badges the teacher gives while grading a recording (issue #4, migrations
// 0025 and 0045 - keep the list in sync with the check there).
export const TEACHER_BADGE_IDS = [
  'maly-virtuoz',
  'virtuoz',
  'lovec-not',
  'akordovy-kouzelnik',
  'rytmicky-mistr',
  'velky-pokrok',
  'maly-skladatel',
  'odvazny-muzikant',
  'koncertni-hvezda',
] as const
export type TeacherBadgeId = (typeof TEACHER_BADGE_IDS)[number]

// Every teacher badge at 0, with the given counts on top (never negative).
export function teacherBadgeCounts(counts?: Partial<Record<TeacherBadgeId, number>>): Record<TeacherBadgeId, number> {
  return Object.fromEntries(
    TEACHER_BADGE_IDS.map((id) => [id, Math.max(0, counts?.[id] || 0)]),
  ) as Record<TeacherBadgeId, number>
}

interface SafeBadgeContext {
  stars: number
  streak: number
  totalRecordings: number
  perfectWeek: boolean
  daysPlayedThisWeek: number
  weeklyCount: number
  awardedCounts: Record<TeacherBadgeId, number>
}

interface BadgeDef {
  id: string
  icon: string
  label: string
  // How to earn it, shown next to the badge (a tooltip alone never shows on a phone).
  description: string
  // A small number on the icon for badges of one kind (🔥 3 / 7 / 30) - one icon each, never a stack of them.
  tier?: string
  check: (ctx: SafeBadgeContext) => boolean
  progress: (ctx: SafeBadgeContext) => { current: number; target: number }
  // Given by the teacher, can be earned again and again.
  byTeacher?: boolean
}

export interface BadgeResult {
  id: string
  icon: string
  tier?: string
  label: string
  description: string
  unlocked: boolean
  progressLabel?: string
  byTeacher?: boolean
  // Times awarded, for the teacher's badges.
  count?: number
}

// A badge only the teacher gives, earned again with every award.
function teacherBadge(id: TeacherBadgeId, icon: string, label: string, description: string): BadgeDef {
  return {
    id,
    icon,
    label,
    description,
    byTeacher: true,
    check: (ctx) => ctx.awardedCounts[id] >= 1,
    progress: (ctx) => ({ current: ctx.awardedCounts[id], target: 1 }),
  }
}

export const BADGES: BadgeDef[] = [
  { id: 'novacek', icon: '🌱', label: 'Nováček', description: 'Pošli první nahrávku.', check: (ctx) => ctx.totalRecordings >= 1, progress: (ctx) => ({ current: ctx.totalRecordings, target: 1 }) },
  { id: 'pravidelnost', icon: '🔥', tier: '3', label: 'Pravidelnost', description: 'Cvič 3 dny po sobě.', check: (ctx) => ctx.streak >= 3, progress: (ctx) => ({ current: ctx.streak, target: 3 }) },
  { id: 'tyden-v-ohni', icon: '🔥', tier: '7', label: 'Týden v ohni', description: 'Cvič 7 dní po sobě.', check: (ctx) => ctx.streak >= 7, progress: (ctx) => ({ current: ctx.streak, target: 7 }) },
  { id: 'mesic-discipliny', icon: '🔥', tier: '30', label: 'Měsíc disciplíny', description: 'Cvič 30 dní po sobě.', check: (ctx) => ctx.streak >= 30, progress: (ctx) => ({ current: ctx.streak, target: 30 }) },
  { id: 'stoleti-legenda', icon: '🏆', tier: '100', label: 'Stoletá legenda', description: 'Cvič 100 dní po sobě.', check: (ctx) => ctx.streak >= 100, progress: (ctx) => ({ current: ctx.streak, target: 100 }) },
  { id: 'deset-melodii', icon: '🎵', tier: '10', label: 'Deset melodií', description: 'Pošli 10 nahrávek.', check: (ctx) => ctx.totalRecordings >= 10, progress: (ctx) => ({ current: ctx.totalRecordings, target: 10 }) },
  { id: 'padesat-melodii', icon: '🎼', tier: '50', label: 'Padesát melodií', description: 'Pošli 50 nahrávek.', check: (ctx) => ctx.totalRecordings >= 50, progress: (ctx) => ({ current: ctx.totalRecordings, target: 50 }) },
  { id: 'maly-virtuoz', icon: '⭐', label: 'Malý virtuoz', description: 'Zahraj skladbu bez chyb. Dává ho učitel.', byTeacher: true, check: (ctx) => ctx.awardedCounts['maly-virtuoz'] >= 1, progress: (ctx) => ({ current: ctx.awardedCounts['maly-virtuoz'], target: 1 }) },
  { id: 'virtuoz', icon: '🌟', label: 'Virtuoz', description: 'Splň výzvu od učitele, třeba stupnici v tempu 80.', byTeacher: true, check: (ctx) => ctx.awardedCounts.virtuoz >= 1, progress: (ctx) => ({ current: ctx.awardedCounts.virtuoz, target: 1 }) },
  teacherBadge('lovec-not', '🎶', 'Lovec not', 'Za správně nastudovanou skladbu podle notového zápisu.'),
  teacherBadge('akordovy-kouzelnik', '🪄', 'Akordový kouzelník', 'Za sekvenci akordů zahranou plynule za sebou.'),
  teacherBadge('rytmicky-mistr', '🥁', 'Rytmický mistr', 'Za výrazné zlepšení rytmu.'),
  teacherBadge('velky-pokrok', '📈', 'Velký pokrok', 'Za osobní hudební zlepšení.'),
  teacherBadge('maly-skladatel', '✏️', 'Malý skladatel', 'Za vlastní hudební nápad nebo skladbu.'),
  teacherBadge('odvazny-muzikant', '🦁', 'Odvážný muzikant', 'Za překonání obtížného hudebního místa.'),
  teacherBadge('koncertni-hvezda', '🎤', 'Koncertní hvězda', 'Za vystoupení před publikem.'),
  { id: 'perfektni-tyden', icon: '📅', label: 'Perfektní týden', description: 'Cvič každý den v týdnu.', check: (ctx) => !!ctx.perfectWeek, progress: (ctx) => ({ current: ctx.daysPlayedThisWeek, target: 7 }) },
  { id: 'tydenni-cil', icon: '🎯', tier: '3', label: 'Týdenní cíl', description: 'Pošli 3 nahrávky za týden.', check: (ctx) => ctx.weeklyCount >= 3, progress: (ctx) => ({ current: ctx.weeklyCount, target: 3 }) },
]

export function computeBadges(ctx: BadgeContext): BadgeResult[] {
  const safeCtx: SafeBadgeContext = {
    stars: Math.max(0, ctx?.stars || 0),
    streak: Math.max(0, ctx?.streak || 0),
    totalRecordings: Math.max(0, ctx?.totalRecordings || 0),
    perfectWeek: !!ctx?.perfectWeek,
    daysPlayedThisWeek: Math.max(0, ctx?.daysPlayedThisWeek || 0),
    weeklyCount: Math.max(0, ctx?.weeklyCount || 0),
    awardedCounts: teacherBadgeCounts(ctx?.awardedCounts),
  }
  return BADGES.map((badge) => {
    const unlocked = badge.check(safeCtx)
    const result: BadgeResult = {
      id: badge.id,
      icon: badge.icon,
      tier: badge.tier,
      label: badge.label,
      description: badge.description,
      unlocked,
    }
    if (badge.byTeacher) {
      result.byTeacher = true
      if (unlocked) result.count = badge.progress(safeCtx).current
      else result.progressLabel = 'Uděluje učitel'
      return result
    }
    if (!unlocked) {
      const p = badge.progress(safeCtx)
      const current = Math.min(p.current, p.target)
      result.progressLabel = `${current}/${p.target}`
    }
    return result
  })
}

export interface LeagueEntry {
  name: string
  weeklyCount: number
}

export interface LeagueResult extends LeagueEntry {
  tier: 'gold' | 'silver' | 'bronze'
  rank: number
}

// Students with weeklyCount 0 are excluded - a league only makes sense
// among people who actually practiced this week.
export function computeWeeklyLeague(entries: LeagueEntry[] | undefined): LeagueResult[] {
  const active = (entries || []).filter((e) => e && e.weeklyCount > 0)
  active.sort((a, b) => b.weeklyCount - a.weeklyCount)
  const n = active.length
  return active.map((e, idx) => {
    let tier: LeagueResult['tier']
    if (n <= 2) {
      tier = idx === 0 ? 'gold' : 'silver'
    } else {
      const third = Math.ceil(n / 3)
      if (idx < third) tier = 'gold'
      else if (idx < third * 2) tier = 'silver'
      else tier = 'bronze'
    }
    return { name: e.name, weeklyCount: e.weeklyCount, tier, rank: idx + 1 }
  })
}

export interface MascotSkin {
  id: string
  icon: string
  label: string
  unlockLevel: number
}

export const MASCOT_SKINS: MascotSkin[] = [
  { id: 'noticka', icon: '🎵', label: 'Nota', unlockLevel: 1 },
  { id: 'kytara', icon: '🎸', label: 'Kytara', unlockLevel: 2 },
  { id: 'bubny', icon: '🥁', label: 'Bubny', unlockLevel: 3 },
  { id: 'klavir', icon: '🎹', label: 'Klávesy', unlockLevel: 4 },
  { id: 'mikrofon', icon: '🎤', label: 'Mikrofon', unlockLevel: 5 },
]

export function computeUnlockedSkins(level: number | undefined): MascotSkin[] {
  const safeLevel = Math.max(1, level || 1)
  return MASCOT_SKINS.filter((skin) => skin.unlockLevel <= safeLevel)
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// today is injectable so tests don't depend on the real clock.
export function isPerfectWeek(playedDateKeys: string[], today: Date): boolean {
  const playedSet = new Set(playedDateKeys)
  const dayOfWeek = (today.getDay() + 6) % 7 // 0 = Monday
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (dayOfWeek - i))
    if (!playedSet.has(toDateKey(d))) return false
  }
  return true
}

export function hasPlayedToday(playedDateKeys: string[], today: Date): boolean {
  return playedDateKeys.includes(toDateKey(today))
}

export interface QuestContext {
  playedToday: boolean
  weeklyCount: number
}

export interface QuestResult {
  id: string
  label: string
  current: number
  target: number
  completed: boolean
}

const WEEKLY_QUEST_TARGET = 5

export function computeQuests(ctx: QuestContext): QuestResult[] {
  const weeklyCount = Math.max(0, ctx.weeklyCount || 0)
  return [
    {
      id: 'daily-practice',
      label: 'Procvič dnes alespoň jednou',
      current: ctx.playedToday ? 1 : 0,
      target: 1,
      completed: ctx.playedToday,
    },
    {
      id: 'weekly-stars',
      label: `Pošli ${WEEKLY_QUEST_TARGET} nahrávek tento týden`,
      current: Math.min(weeklyCount, WEEKLY_QUEST_TARGET),
      target: WEEKLY_QUEST_TARGET,
      completed: weeklyCount >= WEEKLY_QUEST_TARGET,
    },
  ]
}
