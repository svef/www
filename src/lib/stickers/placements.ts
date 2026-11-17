/**
 * Where the stickers go. Hardcoded (svef/www#121), but as plain data: one record per
 * sticker, so moving the list into the CMS later is a change of where it is read from,
 * not of how it is drawn. `resolveStickers` (./resolve) turns it into what a page renders.
 *
 * Reproduces the export's placements. Order matters: it is the export's document order,
 * and the pink/red alternation of recoloured stickers follows it.
 */
import type { ArtworkName } from './artwork'
import type { LocalizedCopy, StickerTone } from './text'

/** The pages that carry stickers. `footer` is the shared footer band, on every page. */
export type StickerPage =
  | 'forsida'
  | 'vidburdir'
  | 'vefverdlaunin'
  | 'frettir'
  | 'um-svef'
  | 'stjorn'
  | 'spurt-og-svarad'
  | 'skraning'
  | 'erindi'
  | 'hafa-samband'
  | 'footer'

/** The band a sticker is positioned against (it is absolutely placed inside it). */
export type BandName = 'hero' | 'events' | 'header' | 'festival' | 'footer'

/** A band's colour. Violet is the one that matters: nothing violet may sit on it. */
export type BandTone = 'dark' | 'violet' | 'pink' | 'yellow' | 'red'

/** CSS lengths, so `clamp()` and `calc()` work. Unset sides are left to the layout. */
export interface StickerPosition {
  top?: string
  right?: string
  bottom?: string
  left?: string
}

interface BaseSticker {
  page: StickerPage
  band: BandName
  /** The colour of that band (for the violet-on-violet rule). */
  bandTone: BandTone
  position: StickerPosition
  /** Degrees. */
  rotate: number
  /** Parallax speed against the band, as the export's `data-speed`. 0: none. */
  speed: number
  /**
   * Shown on phones (under 760px) at this position instead. Left out: hidden there,
   * as the export hides stickers on phones.
   */
  mobile?: StickerPosition & { width?: string }
}

export interface ArtworkSticker extends BaseSticker {
  kind: 'artwork'
  art: ArtworkName
}

export interface TextSticker extends BaseSticker {
  kind: 'text'
  copy: LocalizedCopy
  tone: StickerTone
}

export type StickerPlacement = ArtworkSticker | TextSticker

/** Where every page header (`.phead`) puts its sticker. */
const HEADER_POSITION: StickerPosition = { right: '6%', top: 'clamp(170px, 16vw, 230px)' }

function header(page: StickerPage, art: ArtworkName): ArtworkSticker {
  return {
    page,
    kind: 'artwork',
    art,
    band: 'header',
    bandTone: 'violet',
    position: HEADER_POSITION,
    rotate: 6,
    speed: 0.15,
  }
}

export const STICKER_PLACEMENTS: readonly StickerPlacement[] = [
  // Home: the hero, then two on the "next events" section
  {
    page: 'forsida',
    kind: 'artwork',
    art: 'trust-me-developer',
    band: 'hero',
    bandTone: 'dark',
    position: { right: '6%', top: '42%' },
    rotate: 7,
    speed: 0,
  },
  {
    page: 'forsida',
    kind: 'artwork',
    art: 'love-design-system',
    band: 'events',
    bandTone: 'dark',
    position: { left: 'max(14%, calc(50% - 470px))', bottom: 'clamp(30px, 4vw, 80px)' },
    rotate: -5,
    speed: -0.12,
  },
  {
    page: 'forsida',
    kind: 'artwork',
    art: 'needs-sparkles',
    band: 'events',
    bandTone: 'dark',
    position: { right: '5%', top: '-40px' },
    rotate: 6,
    speed: 0.12,
  },
  header('vidburdir', 'cool'),
  {
    page: 'vefverdlaunin',
    kind: 'artwork',
    art: 'needs-sparkles',
    band: 'festival',
    bandTone: 'yellow',
    position: { right: '7%', bottom: '16%' },
    rotate: -6,
    speed: -0.15,
  },
  header('frettir', 'trend-alert'),
  header('um-svef', 'not-accessible'),
  header('stjorn', 'trust-me-designer'),
  header('spurt-og-svarad', 'trust-me-developer'),
  header('skraning', 'developer-friendly'),
  header('erindi', 'love-design-system'),
  header('hafa-samband', 'could-have-been-email'),
  // The footer band, on every page. On phones it stays, tucked into the top-left step.
  {
    page: 'footer',
    kind: 'artwork',
    art: 'not-accessible',
    band: 'footer',
    bandTone: 'violet',
    position: { left: 'clamp(70px, 9vw, 150px)', top: 'clamp(100px, 9vw, 140px)' },
    rotate: -7,
    speed: -0.15,
    mobile: { left: '44px', top: '72px', width: '130px' },
  },
]
