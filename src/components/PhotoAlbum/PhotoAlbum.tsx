'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Button } from '@/components/Button/Button'
import { Shape } from '@/components/Shape/Shape'
import { PhotoLightbox } from './PhotoLightbox'
import {
  orientationOf,
  tileLayer,
  TileFace,
  tileLook,
  type AlbumPhoto,
} from './PhotoTile'
import styles from './PhotoAlbum.module.scss'

export type { AlbumPhoto } from './PhotoTile'

export interface PhotoAlbumProps {
  /** The album's title: names the lightbox. */
  title: string
  /** The album's photos. Empty draws `placeholderCount` brand tiles instead. */
  photos?: AlbumPhoto[]
  /** Tiles to draw when the album has no photos yet. The export draws eight. */
  placeholderCount?: number
  /** Photos shown at first, and added by each press of the "show more" button. */
  pageSize?: number
  /** Which colour the first tile takes; the export staggers it per album. */
  colorOffset?: number
  labels: {
    /** Prefix of a tile's accessible name, e.g. "Skoða mynd". */
    view: string
    prev: string
    next: string
    close: string
    /** "Mynd" — the label on a placeholder tile. */
    placeholder: string
    showMore: string
    /** Template, `Sýni {shown} af {total}`. */
    shown: string
    /** Template, `Mynd {n} af {total}`. */
    counter: string
  }
}

/**
 * One album's photo grid and its lightbox (the export's `ul.gallery[data-gallery]`).
 *
 * Each tile is a shape on the engine — colour rotating through violet, pink, yellow and
 * red, a photo filling its layer, the caption in a notch. An album with no photos yet gets
 * `placeholderCount` plain colour tiles labelled "Mynd 1…". A large album shows
 * `pageSize` photos and a button for the next page: only those tiles exist, so a ceremony's
 * hundreds of photos neither mount hundreds of shapes nor load hundreds of images. The
 * lightbox walks the whole album, shown or not.
 */
export function PhotoAlbum({
  title,
  photos = [],
  placeholderCount = 8,
  pageSize = 24,
  colorOffset = 0,
  labels,
}: PhotoAlbumProps) {
  const count = photos.length > 0 ? photos.length : placeholderCount
  const [visible, setVisible] = useState(pageSize)
  const [index, setIndex] = useState<number | null>(null)
  const shown = Math.min(visible, count)
  const gridRef = useRef<HTMLUListElement>(null)
  // The first tile of the page just added. Focus goes to it: the button that was pressed
  // is gone once the last page is in, and focus on <body> would restart the page's tab order.
  const focusAt = useRef<number | null>(null)

  useEffect(() => {
    if (focusAt.current === null) return
    gridRef.current
      ?.querySelectorAll<HTMLElement>('li > button')
      [focusAt.current]?.focus()
    focusAt.current = null
  }, [shown])

  return (
    <>
      <ul ref={gridRef} className={styles.grid}>
        {Array.from({ length: shown }, (_, i) => {
          const photo = photos[i]
          const look = tileLook(i, colorOffset)
          const name = photo?.alt
            ? `${labels.view}: ${photo.alt}`
            : `${labels.view} ${i + 1}`
          return (
            // Keyed by position: the same upload can be in an album twice.
            <li key={i} className={styles.item} data-orient={orientationOf(photo)}>
              <Shape
                as="button"
                type="button"
                className={clsx(styles.tile, photo && styles.hasPhoto)}
                color={look.color}
                // A tile with a caption has the caption's notch and no decorative corners.
                auto={photo?.caption ? [] : ['tl', 'tr', 'br']}
                pad={photo ? (photo.caption ? 20 : 0) : 10}
                aria-label={name}
                aria-haspopup="dialog"
                onClick={() => setIndex(i)}
                layer={tileLayer({ photo, sizes: '(max-width: 800px) 50vw, 320px' })}
              >
                <TileFace photo={photo} index={i} placeholderLabel={labels.placeholder} />
              </Shape>
            </li>
          )
        })}
      </ul>
      {count > shown && (
        <div className={styles.more}>
          <Button
            onClick={() => {
              focusAt.current = shown
              setVisible(shown + pageSize)
            }}
          >
            {labels.showMore}
          </Button>
          {/* Said when more arrive; the button keeps focus, so nothing else announces it. */}
          <p className={styles.moreStatus} role="status">
            {labels.shown
              .replace('{shown}', String(shown))
              .replace('{total}', String(count))}
          </p>
        </div>
      )}
      <PhotoLightbox
        index={index}
        count={count}
        photos={Array.from({ length: count }, (_, i) => photos[i])}
        label={title}
        colorOffset={colorOffset}
        onIndexChange={setIndex}
        labels={labels}
      />
    </>
  )
}
