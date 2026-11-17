/**
 * Presets for shapes the export configures in script rather than markup.
 */
import { parseCorners, type Corner } from './geometry'
import type { Rng } from './random'

/**
 * Page-head bands. The export's router re-rolls every `.phead` (except the Web Awards
 * one) on each visit: one of these corner sets, the large notch size seven times in
 * ten, a lively drift, no bottom cap, and a random extra reach (0–260px) on the title's
 * notch.
 */
export const PAGE_HEAD_AUTO = [
  'tr,br',
  'tr,bl',
  'br,bl',
  'tr,br,bl',
  'br',
  'bl',
  'br,bl',
  'tr,bl,br',
] as const

export interface PageHeadPreset {
  auto: Corner[]
  autoSize: 'lg' | undefined
  ambient: 'lively'
  nocap: true
  /** Pass to the title's `<Notch drift>`. */
  titleDrift: number
}

/**
 * The page-head roll, from a seeded stream instead of `Math.random()`, so the server
 * and the client agree. Draws in the export's order: corners, size, title drift.
 */
export function pageHeadPreset(rng: Rng): PageHeadPreset {
  const i = Math.min(PAGE_HEAD_AUTO.length - 1, Math.floor(rng() * PAGE_HEAD_AUTO.length))
  const auto = parseCorners(PAGE_HEAD_AUTO[i])
  const autoSize = rng() < 0.7 ? 'lg' : undefined
  const titleDrift = Math.round(rng() * 260)
  return { auto, autoSize, ambient: 'lively', nocap: true, titleDrift }
}
