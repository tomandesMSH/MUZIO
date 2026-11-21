import { describe, expect, it } from 'vitest'
import { rankLeague } from './league'

const row = (short_name: string, days: number, is_me = false) => ({ short_name, days, is_me })

describe('rankLeague', () => {
  it('orders by days, shares places, hides pupils without a flame', () => {
    const view = rankLeague([row('Adam N.', 3), row('Bára K.', 5), row('Cyril P.', 3), row('Dana S.', 0)])
    expect(view.shown.map((r) => [r.short_name, r.place])).toEqual([
      ['Bára K.', 1],
      ['Adam N.', 2],
      ['Cyril P.', 2],
    ])
    expect(view.withoutFlames).toBe(1)
  })

  it('adds the pupil below the top when they are further down', () => {
    const rows = [row('A', 7), row('B', 6), row('C', 5), row('D', 4), row('E', 3), row('F', 2), row('Já', 1, true)]
    const view = rankLeague(rows)
    expect(view.shown).toHaveLength(6)
    expect(view.shown[5]).toMatchObject({ short_name: 'Já', place: 7, is_me: true })
  })

  it('a pupil without a flame is not listed, only counted', () => {
    const view = rankLeague([row('A', 2), row('Já', 0, true)])
    expect(view.shown.map((r) => r.short_name)).toEqual(['A'])
    expect(view.withoutFlames).toBe(1)
  })
})
