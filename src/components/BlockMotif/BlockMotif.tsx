'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { LOCKUPS } from '@/components/Logo/lockups'
import styles from './BlockMotif.module.scss'

/**
 * The brand's signature block cluster, used decoratively at section edges.
 *
 * It draws one of the mark's own lockup silhouettes rather than a row of equal
 * squares, so the decoration and the logo share a shape language instead of
 * merely alluding to one. The lockups are square and the motif is a wide strip,
 * so the shape is cropped to a band of itself by a shorter parent with hidden
 * overflow — a real crop, where stretching the polygon into a wide box would
 * distort angles the mark does not have.
 *
 * The shape is picked per visit, the way the logo picks its starting lockup.
 * Unlike the logo it does not then cycle: this is scenery, and scenery that
 * moves while you read is just noise.
 *
 * Purely visual, so `aria-hidden`.
 */
export function BlockMotif({
  className,
  tone = 'violet',
}: {
  className?: string
  tone?: 'violet' | 'mixed'
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Chosen after hydration for the same reason as the logo's: the pages are
    // prerendered, so picking during render would disagree with the server's
    // HTML. Runs once and does not cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(Math.floor(Math.random() * LOCKUPS.length))
  }, [])

  return (
    <span className={clsx(styles.motif, className)} aria-hidden="true">
      <span
        className={clsx(styles.shape, tone === 'mixed' && styles.bright)}
        style={{ clipPath: LOCKUPS[index].clip }}
      />
    </span>
  )
}
