// "Před a po": the first and the latest recording of the same assignment or
// own piece, so the pupil (and the teacher) can hear how it moved on. Only
// recordings that still have their sound count (old ones get archived).

interface Log {
  id: string
  created_at: string
  audio_url: string | null
  assignment_id?: string | null
  own_piece_id?: string | null
}

export interface ProgressPair<T extends Log> {
  // 'a:<assignment id>' or 'p:<own piece id>'
  key: string
  assignmentId?: string
  ownPieceId?: string
  first: T
  latest: T
  // Recordings with sound in the group.
  count: number
}

export function progressPairs<T extends Log>(logs: T[]): ProgressPair<T>[] {
  const groups = new Map<string, T[]>()
  for (const log of logs) {
    if (!log.audio_url) continue
    const key = log.assignment_id ? `a:${log.assignment_id}` : log.own_piece_id ? `p:${log.own_piece_id}` : undefined
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), log])
  }
  const pairs: ProgressPair<T>[] = []
  for (const [key, group] of groups) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at))
    pairs.push({
      key,
      ...(key.startsWith('a:') ? { assignmentId: key.slice(2) } : { ownPieceId: key.slice(2) }),
      first: sorted[0],
      latest: sorted[sorted.length - 1],
      count: sorted.length,
    })
  }
  return pairs.sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at))
}
