'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Header.module.scss'

/**
 * The sticky bar itself, which is deep at the top of a page and shrinks once
 * you start scrolling.
 *
 * The state comes from an IntersectionObserver watching a one-pixel sentinel
 * above the header, not from a scroll handler: the browser reports the crossing
 * itself, so nothing runs on every frame of a scroll. The expanded state is the
 * default, so the bar is correct before this hydrates and for anyone without
 * JavaScript — only the shrinking is lost.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [compact, setCompact] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { threshold: 1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} className={styles.sentinel} aria-hidden="true" />
      <header className={styles.header} data-compact={compact ? 'true' : undefined}>
        {children}
      </header>
    </>
  )
}
