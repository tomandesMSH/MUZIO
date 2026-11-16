// Numbers on the navigation items (recordings waiting for the teacher...).
// The sidebar and the bottom bar both show them and every page mounts its own
// copy, so the counts live here, shared, fetched at most every 30 s unless
// something changed them (refreshNavBadges).
import { useEffect, useSyncExternalStore } from 'react'
import { countPendingReview } from './data/practiceLogs'

export type NavBadgeKey = 'pending-review'

type Counts = Partial<Record<NavBadgeKey, number>>

const FETCHERS: Record<NavBadgeKey, () => Promise<number>> = {
  'pending-review': countPendingReview,
}

const MAX_AGE_MS = 30_000
let counts: Counts = {}
const fetchedAt = new Map<NavBadgeKey, number>()
const inFlight = new Set<NavBadgeKey>()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function load(key: NavBadgeKey, force = false) {
  const age = Date.now() - (fetchedAt.get(key) ?? 0)
  if (inFlight.has(key) || (!force && age < MAX_AGE_MS)) return
  inFlight.add(key)
  FETCHERS[key]()
    .then((n) => {
      counts = { ...counts, [key]: n }
      fetchedAt.set(key, Date.now())
      emit()
    })
    .catch(() => {
      // No number shown; the menu works the same.
    })
    .finally(() => inFlight.delete(key))
}

// After grading (or anything else that changes a count).
export function refreshNavBadges() {
  for (const key of fetchedAt.keys()) load(key, true)
}

// For tests.
export function resetNavBadges() {
  counts = {}
  fetchedAt.clear()
  inFlight.clear()
}

export function useNavBadges(keys: NavBadgeKey[]): Counts {
  const joined = keys.join(',')
  useEffect(() => {
    for (const key of joined.split(',').filter(Boolean) as NavBadgeKey[]) load(key)
  }, [joined])
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => counts,
  )
}
