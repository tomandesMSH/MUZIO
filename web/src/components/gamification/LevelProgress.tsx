import { computeLevel, RECORDINGS_PER_LEVEL } from '../../lib/game-logic'
import { Progress } from '../ui/Progress'

export function LevelProgress({ recordings }: { recordings: number }) {
  const info = computeLevel(recordings)
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-heading font-semibold mb-1.5">
        <span>
          Level {info.level} · {info.title}
        </span>
        <span className="text-text-muted font-body font-normal text-xs">
          {info.recordingsInLevel}/{RECORDINGS_PER_LEVEL} nahrávek
        </span>
      </div>
      <Progress value={info.progress} />
    </div>
  )
}
