import { describe, expect, it } from 'vitest'
import { daysLabel, weeklyGoalFor } from './weeklyGoal'

describe('weeklyGoalFor', () => {
  it('takes the highest goal of the classes, none without one', () => {
    expect(weeklyGoalFor([{ weekly_goal_days: 3 }, { weekly_goal_days: 5 }, { weekly_goal_days: null }])).toBe(5)
    expect(weeklyGoalFor([{ weekly_goal_days: null }, {}])).toBeNull()
    expect(weeklyGoalFor([])).toBeNull()
  })
})

describe('daysLabel', () => {
  it('uses Czech plural forms', () => {
    expect([1, 2, 4, 5, 7].map(daysLabel)).toEqual(['1 den', '2 dny', '4 dny', '5 dní', '7 dní'])
  })
})
