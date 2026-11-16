// The teacher's "Ke kontrole" list: filter by class and assignment, sort.
export type ReviewSort = 'oldest' | 'newest'

export interface ReviewFilter {
  classroomId?: string
  // An assignment id, or NO_ASSIGNMENT for recordings sent without one.
  assignmentId?: string
  sort: ReviewSort
}

export const NO_ASSIGNMENT = '__none__'

interface Log {
  user_id: string
  created_at: string
  assignment_id?: string | null
}

export function filterReview<T extends Log>(logs: T[], filter: ReviewFilter, membersOf: Map<string, Set<string>>): T[] {
  const members = filter.classroomId ? membersOf.get(filter.classroomId) : undefined
  return logs
    .filter((log) => !filter.classroomId || members?.has(log.user_id))
    .filter((log) =>
      !filter.assignmentId
        ? true
        : filter.assignmentId === NO_ASSIGNMENT
          ? !log.assignment_id
          : log.assignment_id === filter.assignmentId,
    )
    .sort((a, b) =>
      filter.sort === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at),
    )
}

// The assignments that actually have something waiting (for the picker), with counts.
export function assignmentsWaiting<T extends Log>(logs: T[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const log of logs) {
    const key = log.assignment_id ?? NO_ASSIGNMENT
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}
