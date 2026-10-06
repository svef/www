'use client'

import { useEffect, useState } from 'react'
import { BOX, LOCKUPS } from './lockups'
import styles from './LandingLogo.module.scss'

const HOLD_MS = 4000

/**
 * The SVEF mark, cycling through the brand's lockups.
 *
 * The violet shape is an HTML element clipped with `clip-path`, not an SVG
 * polygon — `points` cannot be animated in CSS, `clip-path` can. The letterforms
 * are one piece of artwork that only ever moves; they are the same size in every
 * lockup, so nothing about them is interpolated except position.
 *
 * The first lockup is rendered on the server, so the markup is a complete mark
 * before any JavaScript runs and for anyone without it. Cycling starts after
 * hydration from a random point, which is also what makes the mark differ
 * between visits. `prefers-reduced-motion` leaves it on whichever one it started.
 */
export function LandingLogo({ label }: { label: string }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    const start = Math.floor(Math.random() * LOCKUPS.length)
    setI(start)

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches) return

    const id = window.setInterval(() => setI((n) => (n + 1) % LOCKUPS.length), HOLD_MS)
    return () => window.clearInterval(id)
  }, [])

  const lockup = LOCKUPS[i]

  return (
    <span className={styles.logo} role="img" aria-label={label}>
      <span className={styles.shape} style={{ clipPath: lockup.clip }} />
      <svg
        className={styles.letters}
        viewBox={`0 0 ${BOX.w} ${BOX.h}`}
        style={{ transform: `translate(${lockup.letters[0]}%, ${lockup.letters[1]}%)` }}
        aria-hidden="true"
        focusable="false"
      >
      <polygon points="485.63,356.76 485.63,370.71 418.59,370.71 418.59,278.98 484.38,278.98 484.38,292.91 435.19,292.91 435.19,316.99 481.8,316.99 481.8,330.93 435.19,330.93 435.19,356.76 485.63,356.76" />
      <polygon points="409.33,278.94 379.59,370.7 348.75,370.7 319.0,278.94 337.19,278.98 361.4,355.2 366.92,355.2 391.15,278.98 409.33,278.94" />
      <polygon points="513.51,292.91 513.51,316.38 557.63,316.38 557.63,330.31 513.51,330.31 513.51,370.71 496.92,370.71 496.92,278.98 561.32,278.98 561.32,292.91 513.51,292.91" />
      <path d="m254.91,367.71c-5.76-2.93-9.76-6.83-11.99-11.71-2.23-4.88-3.35-10.34-3.35-16.38v-.28h15.06c0,4.18.74,7.72,2.23,10.6,1.49,2.88,3.9,5.14,7.25,6.76,3.35,1.63,7.9,2.44,13.66,2.44s10.5-.65,13.94-1.95c3.44-1.3,5.88-3.04,7.32-5.23,1.44-2.18,2.16-4.67,2.16-7.46s-.65-4.93-1.95-6.41c-1.3-1.49-3.81-2.72-7.53-3.69-3.72-.98-9.62-2.02-17.71-3.14-8.55-1.21-15.27-2.62-20.15-4.25-4.88-1.62-8.53-4.06-10.94-7.32-2.42-3.25-3.62-7.76-3.62-13.52s1.53-10.67,4.6-14.99c3.07-4.32,7.46-7.67,13.18-10.04,5.72-2.37,12.52-3.56,20.43-3.56,8.83,0,15.99,1.25,21.47,3.76,5.48,2.51,9.46,6.18,11.92,11.01,2.46,4.83,3.69,10.92,3.69,18.26h-15.06c0-4.65-.81-8.41-2.44-11.29-1.63-2.88-4.07-5.07-7.32-6.55-3.25-1.49-7.25-2.23-11.99-2.23s-8.46.61-11.71,1.81c-3.25,1.21-5.79,2.88-7.6,5.02-1.81,2.14-2.72,4.51-2.72,7.11,0,3.25.6,5.69,1.81,7.32,1.21,1.63,3.62,2.95,7.25,3.97,3.62,1.02,9.43,2.09,17.43,3.21,8.74,1.12,15.57,2.51,20.49,4.18,4.93,1.67,8.64,4.09,11.15,7.25,2.51,3.16,3.76,7.53,3.76,13.11s-1.21,10.23-3.62,14.5c-2.42,4.28-6.58,7.69-12.48,10.25-5.9,2.56-13.83,3.83-23.77,3.83s-17.1-1.46-22.87-4.39Z" />
      </svg>
    </span>
  )
}
