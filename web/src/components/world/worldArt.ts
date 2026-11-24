import type { CSSProperties } from 'react'
import { FLAMES_PER_CYCLE, FLAMES_PER_PHASE } from '../../lib/flames'
import type { WorldId } from '../../lib/world'

// The artwork of each world, in public/worlds/<id>/<id>-<n>.<ext>, n = 1..count,
// each picture adding to the one before. Two kinds:
//  - lines:   line drawings (SVG) shown as a mask over the accent colour, so
//             they follow the theme (the castle);
//  - picture: full-colour illustrations (WebP) shown as they are.
// `frames` lists the pictures that exist so far. A missing one is stood in
// for by the next one there is, faded and grey, filling in with the flames.
interface ArtSpec {
  kind: 'lines' | 'picture'
  count: number
  frames: number[]
  ext: 'svg' | 'webp'
}

const ART: Partial<Record<WorldId, ArtSpec>> = {
  hrad: { kind: 'lines', count: 7, frames: [1, 2, 3, 4, 5, 6, 7], ext: 'svg' },
}

export interface WorldArt {
  url: string
  kind: 'lines' | 'picture'
  // 1 = this very picture; less = a stand-in for a picture that isn't drawn
  // yet, shown that much filled in.
  reveal: number
}

// How many pictures the world will have (0 = no artwork yet) and how many exist.
export function artFrameCount(world: WorldId): number {
  return ART[world]?.count ?? 0
}
export function artFramesReady(world: WorldId): number[] {
  return ART[world]?.frames ?? []
}

// Which picture (1..count) belongs to the flames in this round (0..28): the
// first one before any flame, the last one for a finished world, the rest
// spread evenly in between.
export function artFrame(count: number, flamesInCycle: number): number {
  const f = Math.max(0, Math.min(FLAMES_PER_CYCLE, flamesInCycle))
  return 1 + Math.round((f * (count - 1)) / FLAMES_PER_CYCLE)
}

function url(world: WorldId, spec: ArtSpec, frame: number): string {
  return `${import.meta.env.BASE_URL}worlds/${world}/${world}-${frame}.${spec.ext}`
}

// The picture for this world and progress, or undefined without artwork.
export function worldArt(world: WorldId, phase: number, flamesInCycle?: number): WorldArt | undefined {
  const spec = ART[world]
  if (!spec || spec.frames.length === 0) return undefined
  const flames = Math.max(0, Math.min(FLAMES_PER_CYCLE, flamesInCycle ?? phase * FLAMES_PER_PHASE))
  const wanted = artFrame(spec.count, flames)
  if (spec.frames.includes(wanted)) return { url: url(world, spec, wanted), kind: spec.kind, reveal: 1 }
  const next = spec.frames.filter((f) => f > wanted).sort((a, b) => a - b)[0]
  const stand = next ?? Math.max(...spec.frames)
  return { url: url(world, spec, stand), kind: spec.kind, reveal: flames / FLAMES_PER_CYCLE }
}

// The finished world, for the picker.
export function worldCover(world: WorldId): WorldArt | undefined {
  const spec = ART[world]
  if (!spec || spec.frames.length === 0) return undefined
  return { url: url(world, spec, Math.max(...spec.frames)), kind: spec.kind, reveal: 1 }
}

// A stand-in picture: grey and faded at the start, in full colour at the end.
export function revealStyle(reveal: number): CSSProperties | undefined {
  if (reveal >= 1) return undefined
  const r = Math.max(0, reveal)
  return { filter: `grayscale(${1 - r}) opacity(${0.35 + 0.65 * r})` }
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
