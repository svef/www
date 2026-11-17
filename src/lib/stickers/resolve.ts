import { hasViolet, recolorAt, type Recolor } from './artwork'
import { STICKER_PLACEMENTS, type BandName, type StickerPage, type StickerPlacement } from './placements'
import type { StickerTone } from './text'

/** A placement plus the colour decision the "never violet on violet" rule made for it. */
export type ResolvedSticker = StickerPlacement & {
  id: string
  /** Artwork: the replacement for its violet. Text: the tone to use instead of violet. */
  recolor?: Recolor
}

/** Does this sticker contain violet? Artwork: its file. Text: a violet block. */
function usesViolet(s: StickerPlacement): boolean {
  return s.kind === 'artwork' ? hasViolet(s.art) : s.tone === 'violet'
}

/**
 * Applies the recolour rule to a list: a sticker with violet on a violet band becomes
 * pink or red, alternating in list order. The alternation counts only stickers that are
 * recoloured, as the export's does, so it is stable however a page filters the list.
 */
export function resolveAll(list: readonly StickerPlacement[]): ResolvedSticker[] {
  let n = 0
  const seen = new Map<string, number>()
  return list.map((s) => {
    const base = s.kind === 'artwork' ? s.art : 'text'
    const key = `${s.page}-${base}`
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    const resolved: ResolvedSticker = { ...s, id: count > 1 ? `${key}-${count}` : key }
    if (s.bandTone === 'violet' && usesViolet(s)) resolved.recolor = recolorAt(n++)
    return resolved
  })
}

/** The stickers of one page (and, optionally, of one of its bands), recolour decided. */
export function resolveStickers(
  page: StickerPage,
  band?: BandName,
  list: readonly StickerPlacement[] = STICKER_PLACEMENTS,
): ResolvedSticker[] {
  return resolveAll(list).filter((s) => s.page === page && (!band || s.band === band))
}

/** The tone a text sticker is drawn in after the rule. */
export function textTone(s: ResolvedSticker & { kind: 'text' }): StickerTone {
  return s.recolor ?? s.tone
}
