// Žebříček třídy (migration 0054): pupils by flames this week. The same
// number of days shares a place; nobody with 0 days is shown by name.

export interface LeagueRow {
  short_name: string
  days: number
  is_me: boolean
}

export interface RankedRow extends LeagueRow {
  place: number
}

export interface LeagueView {
  // The top ones (with at least one flame), plus the pupil's own row if it
  // isn't among them.
  shown: RankedRow[]
  // Pupils without a flame this week, counted but not named.
  withoutFlames: number
}

export function rankLeague(rows: LeagueRow[], top = 5): LeagueView {
  const active = rows.filter((r) => r.days > 0).sort((a, b) => b.days - a.days || a.short_name.localeCompare(b.short_name, 'cs'))
  const ranked: RankedRow[] = active.map((r) => ({ ...r, place: 1 + active.filter((o) => o.days > r.days).length }))
  const shown = ranked.slice(0, top)
  const me = ranked.find((r) => r.is_me)
  if (me && !shown.includes(me)) shown.push(me)
  return { shown, withoutFlames: rows.length - active.length }
}
