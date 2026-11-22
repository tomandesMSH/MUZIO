import type { CSSProperties } from 'react'
import { FLAMES_PER_CYCLE, FLAMES_PER_PHASE } from '../../lib/flames'
import type { WorldId } from '../../lib/world'

// Hand-drawn artwork of a world: line drawings in public/worlds/<id>/, each
// picture adding to the one before. They are shown as a mask over the accent
// colour, so the lines follow the theme (light / dark / modern).
const ART: Partial<Record<WorldId, number>> = {
  hrad: 7,
}

// How many pictures the world has (0 = none yet).
export function artFrameCount(world: WorldId): number {
  return ART[world] ?? 0
}

// Which picture (1..count) belongs to the flames in this round (0..28): the
// first one before any flame, the last one for a finished world, the rest
// spread evenly in between.
export function artFrame(count: number, flamesInCycle: number): number {
  const f = Math.max(0, Math.min(FLAMES_PER_CYCLE, flamesInCycle))
  return 1 + Math.round((f * (count - 1)) / FLAMES_PER_CYCLE)
}

// The picture for this world and progress, or undefined when the world has no
// artwork yet.
export function worldArtUrl(world: WorldId, phase: number, flamesInCycle?: number): string | undefined {
  const count = ART[world]
  if (!count) return undefined
  const flames = flamesInCycle ?? phase * FLAMES_PER_PHASE
  return `${import.meta.env.BASE_URL}worlds/${world}/${world}-${artFrame(count, flames)}.svg`
}

// The finished world, for the picker.
export function worldCoverUrl(world: WorldId): string | undefined {
  const count = ART[world]
  return count ? `${import.meta.env.BASE_URL}worlds/${world}/${world}-${count}.svg` : undefined
}

export function maskStyle(url: string): CSSProperties {
  const value = `url("${url}")`
  return {
    maskImage: value,
    WebkitMaskImage: value,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }
}
