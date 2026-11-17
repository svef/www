'use client'

import { useMemo, ViewTransition } from 'react'
import { usePathname } from 'next/navigation'
import { PAGE_TURN_NAME, stepPath } from '@/lib/page-turn'
import { createRng, toSeed } from '@/lib/shape/random'
import styles from './PageTurn.module.scss'

/**
 * The block of the page turn (#138). It is always in the document, parked below the
 * screen, because a View Transition can only animate an element that exists in both the
 * old and the new state; `styles/page-turn.scss` moves it. It carries no content, takes
 * no pointer events and is hidden from assistive technology.
 *
 * It is also what makes React start the browser's view transition. `<ViewTransition>`
 * only fires for something that mounts, unmounts or changes in a navigation, and the page
 * itself sits in a layout that persists, so the block is re-keyed by the path: each
 * navigation swaps one block for the next, and React pairs them under one name. The
 * block is tiny, so the browser has almost nothing to capture beyond the page itself.
 *
 * Its step pattern is drawn from the destination's path, so it differs from page to page
 * (the export rolls one per change) while the server and the client agree.
 */
export function PageTurn() {
  const pathname = usePathname()
  const clip = useMemo(() => stepPath(createRng(toSeed(pathname))), [pathname])

  return (
    <ViewTransition
      key={pathname}
      name={PAGE_TURN_NAME}
      share="page-turn-block"
      default="none"
    >
      <div
        className={styles.block}
        aria-hidden="true"
        data-page-turn=""
        style={{ clipPath: clip }}
      />
    </ViewTransition>
  )
}
