// Plamínky: one for every day the pupil sent at least one recording. The days
// don't have to follow each other - a missed day costs nothing (unlike the
// streak). Every 7 flames is one phase of the pupil's world, 4 phases (28
// flames) finish it and a new round starts.
//
// Counted from the recording rows, so archiving the sound (0034) doesn't
// take a flame away. Pure functions - the screen passes the date keys.

export const FLAMES_PER_PHASE = 7
export const PHASES_PER_CYCLE = 4
export const FLAMES_PER_CYCLE = FLAMES_PER_PHASE * PHASES_PER_CYCLE

export interface FlameProgress {
  // All practice days ever.
  total: number
  // Finished worlds (rounds of 28).
  completedCycles: number
  // Flames in the current round, 0..28. A round that has just been finished
  // stays at 28 until the next practice day, so the finished world is shown.
  inCycle: number
  // Phases reached in the current round, 0..4.
  phasesDone: number
  // Lit flames in the row of 7, 0..7. Stays at 7 on the day a phase is reached.
  filled: number
  // Flames still missing to the next phase, 1..7.
  toNextPhase: number
  // Today's flame finished a phase (7, 14, 21 or 28 in the round).
  atMilestone: boolean
}

export function countPracticeDays(dateKeys: Iterable<string>): number {
  return new Set(dateKeys).size
}

export function flameProgress(totalDays: number): FlameProgress {
  const total = Math.max(0, Math.floor(totalDays || 0))
  const completedCycles = Math.floor(total / FLAMES_PER_CYCLE)
  const inCycle = total === 0 ? 0 : total - Math.floor((total - 1) / FLAMES_PER_CYCLE) * FLAMES_PER_CYCLE
  const phasesDone = Math.floor(inCycle / FLAMES_PER_PHASE)
  const atMilestone = inCycle > 0 && inCycle % FLAMES_PER_PHASE === 0
  const filled = atMilestone ? FLAMES_PER_PHASE : inCycle % FLAMES_PER_PHASE
  const toNextPhase = FLAMES_PER_PHASE - (inCycle % FLAMES_PER_PHASE)
  return { total, completedCycles, inCycle, phasesDone, filled, toNextPhase, atMilestone }
}

// "1 plamínek", "2 plamínky", "5 plamínků".
export function flamesLabel(n: number): string {
  if (n === 1) return '1 plamínek'
  if (n >= 2 && n <= 4) return `${n} plamínky`
  return `${n} plamínků`
}
