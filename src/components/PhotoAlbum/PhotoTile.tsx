import Image from 'next/image'
import type { ReactNode } from 'react'
import { Notch } from '@/components/Shape/Notch'
import type { ShapeColor } from '@/components/Shape/Shape'
import type { Corner } from '@/lib/shape/geometry'
import styles from './PhotoAlbum.module.scss'

/** One photo, already resolved for the page's locale. */
export interface AlbumPhoto {
  url: string
  /** Description of the photo. Empty when neither a caption nor the media's alt exists. */
  alt: string
  /** Shown on the tile and in the lightbox. */
  caption?: string | null
  width?: number | null
  height?: number | null
}

/** The export's colour rotation for a gallery's tiles. */
export const TILE_COLORS: readonly ShapeColor[] = ['violet', 'pink', 'yellow', 'red']

/** Where a caption sits, by tile position (the export's `P` table). */
const CAPTION_CORNERS: readonly Corner[] = ['tl', 'tr', 'tl', 'tr']

export type Orientation = 'p' | 'l'

/** `l` for a landscape photo, else `p` (the export's `data-orient`). */
export function orientationOf(photo?: AlbumPhoto): Orientation {
  return photo?.width && photo.height && photo.width > photo.height ? 'l' : 'p'
}

/** What a tile looks like: its colour, and its caption corner. */
export function tileLook(index: number, offset = 0) {
  return {
    color: TILE_COLORS[(index + offset) % TILE_COLORS.length],
    captionCorner: CAPTION_CORNERS[index % CAPTION_CORNERS.length],
  }
}

interface TileLayerProps {
  photo?: AlbumPhoto
  sizes: string
  /** Load this photo ahead of the others (the one open in the lightbox). */
  priority?: boolean
}

interface TileFaceProps {
  photo?: AlbumPhoto
  index: number
  /** `Mynd` / `Photo`: the label on a tile with no photo. */
  placeholderLabel: string
}

/** The photo that fills a tile's colour layer. Decorative: the tile carries the name. */
export function tileLayer({ photo, sizes, priority }: TileLayerProps): ReactNode {
  if (!photo) return null
  return (
    <Image
      className={styles.photo}
      src={photo.url}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
    />
  )
}

/**
 * What goes inside a tile besides the colour layer: the caption in its notch, or the
 * "Mynd 3" label of a placeholder. A notch is cut around each by the shape engine.
 */
export function TileFace({ photo, index, placeholderLabel }: TileFaceProps) {
  const { captionCorner } = tileLook(index)
  if (!photo) {
    return (
      <Notch as="span" corner="bl" className={styles.label} aria-hidden="true">
        {placeholderLabel} {index + 1}
      </Notch>
    )
  }
  if (photo.caption) {
    return (
      <Notch
        as="span"
        corner={captionCorner}
        className={styles.caption}
        data-corner={captionCorner}
        aria-hidden="true"
      >
        {photo.caption}
      </Notch>
    )
  }
  return null
}
