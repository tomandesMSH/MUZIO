// Grading one after another: which waiting recording comes next.
interface Log {
  id: string
  user_id: string
  created_at: string
}

// The same pupil's oldest waiting recording first (their story stays in the
// teacher's head), otherwise the oldest waiting one of anyone.
export function pickNextToGrade<T extends Log>(pending: T[], graded: Log): T | undefined {
  const rest = pending
    .filter((log) => log.id !== graded.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return rest.find((log) => log.user_id === graded.user_id) ?? rest[0]
}

// Graded, or marked as reviewed without a grade (teacher_comment '' then).
export function isReviewed(log: { teacher_comment: string | null }): boolean {
  return log.teacher_comment != null
}

// Marked as reviewed without a grade.
export function isSkipped(log: { teacher_comment: string | null; rating: number | null }): boolean {
  return log.teacher_comment != null && log.rating == null
}

export function reviewLabel(log: { teacher_comment: string | null; rating: number | null }): string {
  return !isReviewed(log) ? 'čeká na hodnocení' : isSkipped(log) ? 'bez hodnocení' : 'ohodnoceno'
}
