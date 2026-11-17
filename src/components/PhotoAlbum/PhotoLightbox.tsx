'use client'

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { ArrowLeft, ArrowRight, X } from '@phosphor-icons/react/dist/ssr'
import { Shape } from '@/components/Shape/Shape'
import {
  orientationOf,
  tileLayer,
  TileFace,
  tileLook,
  type AlbumPhoto,
} from './PhotoTile'
import styles from './PhotoAlbum.module.scss'

export interface PhotoLightboxProps {
  /** Position of the open photo, or null when closed. */
  index: number | null
  /** How many photos (or placeholders) there are to walk. */
  count: number
  /** The photos; a missing entry is a placeholder. */
  photos: readonly (AlbumPhoto | undefined)[]
  /** The dialog's accessible name: the album's title. */
  label: string
  /** Colour rotation offset, matching the album's tiles. */
  colorOffset?: number
  /** Called with the new position, or null to close. */
  onIndexChange: (index: number | null) => void
  labels: {
    close: string
    prev: string
    next: string
    placeholder: string
    /** Template, `Mynd {n} af {total}`: read out when the photo changes. */
    counter: string
  }
}

/**
 * The lightbox (the export's `#lb`): a modal `<dialog>` holding the open photo as a shape
 * tile, previous/next buttons and a counter.
 *
 * The browser does the hard parts of a dialog: `showModal()` makes everything behind it
 * inert, so focus is trapped and cannot reach the page, and Escape closes it. What is ours:
 * the arrow keys (wrapping, so holding one walks the album), moving focus to the close
 * button on open and back to the tile on close, a polite live region for the counter, and
 * `role="img"` with the photo's description on the tile (its layer is decorative). The page
 * behind is kept from scrolling by CSS alone (`html:has(dialog[open])` in globals).
 */
export function PhotoLightbox({
  index,
  count,
  photos,
  label,
  colorOffset = 0,
  onIndexChange,
  labels,
}: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const open = index !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      closeRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Escape (and any other way the browser closes the dialog) arrives here.
  const onClose = useCallback(() => {
    onIndexChange(null)
    // The browser restores focus itself where it can; this covers where it cannot.
    openerRef.current?.focus()
  }, [onIndexChange])

  const go = (delta: number) => {
    if (index === null) return
    onIndexChange((index + delta + count) % count)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    // The page behind is inert, but Tab off the last control would go on to the browser's
    // own interface; wrapping keeps focus inside the dialog.
    if (e.key === 'Tab') {
      const controls = e.currentTarget.querySelectorAll<HTMLElement>('button')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    }
  }

  // A click on the dim area around the photo (the dialog element itself) closes it.
  const onClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) dialogRef.current?.close()
  }

  const announce = (n: number) =>
    labels.counter.replace('{n}', String(n)).replace('{total}', String(count))
  const photo = index !== null ? photos[index] : undefined
  const look = tileLook(index ?? 0, colorOffset)
  const ratio =
    photo?.width && photo.height
      ? photo.width / photo.height
      : orientationOf(photo) === 'l'
        ? 3 / 2
        : 4 / 5
  const alt = photo?.alt || `${label} — ${announce((index ?? 0) + 1)}`

  return (
    <dialog
      ref={dialogRef}
      className={styles.lightbox}
      aria-label={label}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {open && (
        <>
          <button
            ref={closeRef}
            type="button"
            className={`${styles.control} ${styles.closeButton}`}
            aria-label={labels.close}
            onClick={() => dialogRef.current?.close()}
          >
            <X size={26} aria-hidden="true" />
          </button>
          <div
            className={styles.stage}
            style={
              {
                '--ratio': ratio,
                '--stage-max': ratio > 1 ? '960px' : '560px',
              } as CSSProperties
            }
          >
            <Shape
              key={index}
              className={styles.slot}
              color={look.color}
              auto={['tl', 'tr', 'br']}
              pad={photo ? 0 : 14}
              role="img"
              aria-label={alt}
              layer={tileLayer({
                photo,
                sizes: '(max-width: 900px) 92vw, 960px',
                priority: true,
              })}
              data-photo={photo ? '' : undefined}
            >
              <TileFace
                photo={photo}
                index={index}
                placeholderLabel={labels.placeholder}
              />
            </Shape>
            <div className={styles.bar}>
              <button
                type="button"
                className={styles.control}
                aria-label={labels.prev}
                onClick={() => go(-1)}
              >
                <ArrowLeft size={26} aria-hidden="true" />
              </button>
              <span className={styles.count} role="status">
                <span className="sr-only">{announce(index + 1)}</span>
                <span aria-hidden="true">
                  {index + 1} / {count}
                </span>
              </span>
              <button
                type="button"
                className={styles.control}
                aria-label={labels.next}
                onClick={() => go(1)}
              >
                <ArrowRight size={26} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </dialog>
  )
}
