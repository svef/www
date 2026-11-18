'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { loadAward3d } from '@/lib/award3d'
import styles from './Trophy.module.scss'

/** How far outside the viewport the trophy starts loading, so it is drawn by the time it scrolls in. */
const LOAD_MARGIN = '400px 0px'

/**
 * The Web Awards trophy, in 3D (the export's `.foot-trophy`, drawn by the designer's
 * `award3d.js`). A decorative `role="img"` with a label; the canvas inside is hidden
 * from assistive technology.
 *
 * Until the 3D version is there it shows a static picture of the same trophy, and that
 * picture is all there is when the visitor asks for reduced motion (the bundle is then
 * never requested) or when loading fails. The bundle is only requested once the box
 * is near the viewport.
 *
 * It sits in the bottom-right notch of the shape it is placed in, so it must be a
 * direct child of a positioned `<Shape>`; `className` positions it.
 */
export function Trophy({ label, className }: { label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    const start = () => {
      loadAward3d()
        .then((award) => {
          if (!cancelled) award.mount(el).kick()
        })
        .catch(() => {
          // The static picture stays.
        })
    }

    if (typeof IntersectionObserver === 'undefined') {
      start()
      return () => {
        cancelled = true
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect()
          start()
        }
      },
      { rootMargin: LOAD_MARGIN },
    )
    observer.observe(el)
    return () => {
      cancelled = true
      observer.disconnect()
      // The bundle keeps no handle to dispose of; drop its canvas and the mount marker so a
      // remount starts clean.
      el.querySelectorAll('canvas').forEach((c) => c.remove())
      delete (el as HTMLElement & { _award?: unknown })._award
    }
  }, [])

  return (
    <div
      ref={ref}
      className={clsx(styles.trophy, className)}
      role="img"
      aria-label={label}
      data-notch="br"
      data-notch-pad="44"
      data-notch-drift="110"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 4:5 picture, already optimised */}
      <img
        className={styles.still}
        src="/trophy/trophy.webp"
        alt=""
        width={800}
        height={1000}
        draggable={false}
        decoding="async"
      />
    </div>
  )
}
