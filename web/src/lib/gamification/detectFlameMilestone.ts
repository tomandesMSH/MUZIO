import { FLAMES_PER_PHASE, PHASES_PER_CYCLE } from '../flames'

// A phase of the world finished since the pupil last saw the dashboard: 7, 14,
// 21 or 28 flames in the round (lib/flames.ts). Remembered per user on this
// device, like detectNewUnlocks. The first time there is nothing to compare
// with, so the old progress is only noted, not celebrated.

const STORAGE_PREFIX = 'muzio_flame_phases_'

// Phase 1-4 of the round that was just reached, or null.
export function detectFlameMilestone(userId: string, totalFlames: number): number | null {
  const reached = Math.floor(Math.max(0, totalFlames) / FLAMES_PER_PHASE)
  let seen: number | null = null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    seen = raw === null ? null : Number(raw)
  } catch {
    // No storage: celebrate nothing rather than every time.
    return null
  }
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, String(reached))
  } catch {
    // Best effort.
  }
  if (seen === null || !Number.isFinite(seen) || reached <= seen) return null
  return ((reached - 1) % PHASES_PER_CYCLE) + 1
}
