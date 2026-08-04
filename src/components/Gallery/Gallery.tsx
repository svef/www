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
}: {
  count?: number
  viewLabel: string
  prevLabel: string
  nextLabel: string
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
      <Modal
        opened={open}
        onClose={() => setIndex(null)}
        centered
        size="xl"
        radius={0}
        withCloseButton
        title={open ? `${index! + 1} / ${count}` : ''}
      >
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
      </Modal>
    </>
  )
}
