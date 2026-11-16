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
