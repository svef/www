'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal } from '@mantine/core'
import styles from './Gallery.module.scss'

// Click-to-enlarge gallery. Mantine Modal gives focus-trap + Esc + ARIA; we add
// arrow-key prev/next. Placeholders now — real images come from Galleries (R2).
export function Gallery({
  count = 9,
  viewLabel,
  prevLabel,
  nextLabel,
  closeLabel,
}: {
  count?: number
  viewLabel: string
  prevLabel: string
  nextLabel: string
  closeLabel: string
}) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null

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
      <ul className={styles.grid}>
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <button
              type="button"
              className={styles.thumb}
              onClick={() => setIndex(i)}
              aria-label={`${viewLabel} ${i + 1}`}
            />
          </li>
        ))}
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
              <div className={styles.full} aria-hidden="true" />
              <button
                type="button"
                className={styles.nav}
                onClick={() => go(1)}
                aria-label={nextLabel}
              >
                ›
              </button>
            </div>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  )
}
