import { Card } from '../ui/Card'
import { Progress } from '../ui/Progress'
import { daysLabel } from '../../lib/weeklyGoal'

// The pupil's weekly goal from the teacher: "Tento týden: 3 z 5 dní".
export function WeeklyGoalCard({ goal, daysThisWeek }: { goal: number; daysThisWeek: number }) {
  const done = Math.min(daysThisWeek, goal)
  const reached = daysThisWeek >= goal
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h2 className="text-sm font-heading font-semibold">Týdenní cíl</h2>
        <span className="text-xs text-text-muted">
          Tento týden: {done} z {daysLabel(goal)}
        </span>
      </div>
      <Progress value={done / goal} />
      <p className="mt-1.5 text-xs text-text-muted">
        {reached ? 'Cíl na tento týden máš splněný.' : `Cíl od učitele: cvičit ${daysLabel(goal)} v týdnu.`}
      </p>
    </Card>
  )
}
