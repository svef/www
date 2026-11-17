/**
 * The ten die-cut sticker artworks (the designers' SVGs, `public/stickers/`).
 *
 * Seven carry Electric Violet. On a violet band that would vanish, so there the design
 * recolours the violet to pink or red, alternating. An `<img>` cannot be recoloured with
 * CSS, so the two variants are generated files (`scripts/sticker-variants.mjs`) and this
 * module only picks the right path.
 */

export const ARTWORK = {
  cool: { width: 82.98, height: 168.8, violet: true },
  'could-have-been-email': { width: 201.57, height: 137.53, violet: true },
  'designer-friendly': { width: 186.86, height: 124.88, violet: true },
  'developer-friendly': { width: 189.35, height: 116.8, violet: true },
  'love-design-system': { width: 157.8, height: 124.92, violet: true },
  'needs-sparkles': { width: 157.62, height: 111.23, violet: false },
  'not-accessible': { width: 169.37, height: 131.79, violet: false },
  'trend-alert': { width: 169.96, height: 179.7, violet: false },
  'trust-me-designer': { width: 186.25, height: 105.77, violet: true },
  'trust-me-developer': { width: 166.28, height: 121.67, violet: true },
} as const

export type ArtworkName = keyof typeof ARTWORK
export const ARTWORK_NAMES = Object.keys(ARTWORK) as ArtworkName[]

/** What violet is swapped for on a violet band. */
export type Recolor = 'pink' | 'red'

/** The violet in the original files, and the replacements (the brand's pink and red). */
export const VIOLET_HEX = '#8917E1'
export const RECOLOR_HEX: Record<Recolor, string> = { pink: '#FF0FCA', red: '#FF0000' }

/** Does this artwork contain violet, so that it needs recolouring on a violet band? */
export function hasViolet(art: ArtworkName): boolean {
  return ARTWORK[art].violet
}

/** Public path of an artwork, recoloured when `recolor` is given and the artwork has violet. */
export function artworkSrc(art: ArtworkName, recolor?: Recolor): string {
  return recolor && hasViolet(art) ? `/stickers/${art}-${recolor}.svg` : `/stickers/${art}.svg`
}

/**
 * The next colour in the alternation: pink first, then red, then pink… This is the
 * export's `(stkAlt++ % 2) ? red : pink`, taken from a running count.
 */
export function recolorAt(index: number): Recolor {
  return index % 2 === 0 ? 'pink' : 'red'
}
