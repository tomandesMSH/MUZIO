// Týdenní cíl (migration 0053): how many days this week the pupil should
// practise, set by the teacher per class. With several classes the highest
// goal counts.

export function weeklyGoalFor(classrooms: { weekly_goal_days?: number | null }[]): number | null {
  const goals = classrooms.map((c) => c.weekly_goal_days).filter((g): g is number => typeof g === 'number' && g >= 1)
  return goals.length > 0 ? Math.min(7, Math.max(...goals)) : null
}

// "1 den", "2 dny", "5 dní".
export function daysLabel(n: number): string {
  if (n === 1) return '1 den'
  if (n >= 2 && n <= 4) return `${n} dny`
  return `${n} dní`
}
