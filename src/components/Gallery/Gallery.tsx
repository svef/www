'use client'

import { useState, useCallback, useEffect, type CSSProperties } from 'react'
import clsx from 'clsx'
import Image from 'next/image'
import { Modal } from '@mantine/core'
import styles from './Gallery.module.scss'

/** One photo in an album, already resolved for the page's locale. */
export interface GalleryImage {
  url: string
  /** Meaningful description — the row caption, or the media item's own alt. */
  alt: string
  /** The row caption, shown under the enlarged photo. */
  caption?: string | null
  width?: number | null
  height?: number | null
}

export interface GalleryProps {
  /** The album's photos. Empty renders `placeholderCount` placeholder tiles. */
  photos?: GalleryImage[]
  /**
   * Tiles to draw when the album has no images yet.
   *
   * Albums are created before the photos are uploaded, and an album with an
   * empty grid reads as a broken page rather than as one waiting for content.
   * Eight is what the design's own placeholder run shows.
   */
  placeholderCount?: number
  /** Prefix for a thumbnail's accessible name, e.g. "Skoða mynd". */
  /**
   * Draw exactly this many columns instead of reflowing by tile width.
   *
   * Purely presentational, and the one thing that differs between the two
   * places this grid appears. `/myndir` shows a whole album of unknown size, so
   * its tiles reflow by width. The home page's strip shows a fixed four and the
   * export draws them across the content width — which a reflowing grid cannot
   * do, because it fills the row with tracks whether or not there are tiles for
   * them and leaves four small tiles bunched to the left.
   *
   * Collapses to two columns on a phone, as the reflowing grid does at the same
   * widths.
   */
  columns?: number
  viewLabel: string
  prevLabel: string
  nextLabel: string
  closeLabel: string
}

/**
 * Click-to-enlarge photo grid.
 *
 * The lightbox is the point of the page: the association's current site cannot
 * enlarge a photo at all. Mantine's `Modal` supplies the focus trap, Esc and
 * the dialog ARIA; the arrow-key prev/next below is ours, and it wraps rather
 * than dead-ending so holding an arrow key walks the album.
 *
 * Client-side because of that interaction, and only because of it — the page
 * around it stays a prerendered, revalidated Server Component and hands this
 * already-resolved plain data.
 */
export function Gallery({
  photos = [],
  placeholderCount = 8,
  columns,
  viewLabel,
  prevLabel,
  nextLabel,
  closeLabel,
}: GalleryProps) {
  // With no images the grid still draws tiles, so the count that the lightbox
  // and its counter walk is the placeholder run instead.
  const count = photos.length > 0 ? photos.length : placeholderCount
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null
  const current = index !== null ? photos[index] : undefined

  const go = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + count) % count)),
    [count],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go])

  return (
    <>
      <ul
        className={clsx(styles.grid, columns !== undefined && styles.fixedColumns)}
        style={
          columns !== undefined
            ? ({ '--gallery-columns': columns } as CSSProperties)
            : undefined
        }
      >
        {/*
          Keyed by position rather than by photo: the same upload can legitimately
          be added to an album twice, and a URL key would then collide.
        */}
        {Array.from({ length: count }).map((_, i) => {
          const photo = photos[i]
          return (
            <li key={i}>
              <button
                type="button"
                className={styles.thumb}
                onClick={() => setIndex(i)}
                // The button carries the description, so the image inside it is
                // marked decorative — otherwise the name is announced twice.
                aria-label={photo?.alt ? `${viewLabel}: ${photo.alt}` : `${viewLabel} ${i + 1}`}
              >
                {photo && (
                  <Image
                    className={styles.thumbImage}
                    src={photo.url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {/*
        Composed from Modal.* rather than the `Modal` shorthand so the header can be a
        plain `div`. Mantine renders the modal header as `<header>`, and because `dialog`
        is not sectioning content that `<header>` maps to a second `banner` landmark
        beside the site header (axe `landmark-no-duplicate-banner`). The shorthand has no
        way to reach the header — `ModalProps` in Mantine 8.3.18 exposes `closeButtonProps`
        and `overlayProps` but no `headerProps` — so the parts are spelled out instead.
        Everything else matches what the shorthand renders, including the `Modal` static
        selector, so styling and the Styles API are unchanged.
      */}
      <Modal.Root opened={open} onClose={() => setIndex(null)} centered size="xl" radius={0}>
        <Modal.Overlay />
        <Modal.Content radius={0}>
          <Modal.Header component="div">
            <Modal.Title>{open ? `${index! + 1} / ${count}` : ''}</Modal.Title>
            <Modal.CloseButton aria-label={closeLabel} />
          </Modal.Header>
          <Modal.Body>
            <div className={styles.stage}>
              <button
                type="button"
                className={styles.nav}
                onClick={() => go(-1)}
                aria-label={prevLabel}
              >
                ‹
              </button>
              {current ? (
                <Image
                  className={styles.fullImage}
                  src={current.url}
                  alt={current.alt}
                  width={current.width ?? 1200}
                  height={current.height ?? 800}
                  sizes="(max-width: 1024px) 90vw, 960px"
                />
              ) : (
                // No image to show yet — the striped placeholder stands in, and
                // carries nothing for a screen reader to announce.
                <div className={styles.placeholder} aria-hidden="true" />
              )}
              <button
                type="button"
                className={styles.nav}
                onClick={() => go(1)}
                aria-label={nextLabel}
              >
                ›
              </button>
            </div>
            {current?.caption && <p className={styles.caption}>{current.caption}</p>}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  )
}
