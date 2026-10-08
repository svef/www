'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './NavigationProgress.module.scss'

/**
 * A bar across the top of the page while a navigation is in flight.
 *
 * Clicking a link in the App Router fetches the next route before anything on
 * screen changes, so on a slow connection the page sits there looking like the
 * click was missed. This says the click landed.
 *
 * No effect sets state, which is what keeps this honest: the click handler
 * records the path it started from, and the bar is *derived* from whether the
 * path has changed yet. When the navigation commits, `usePathname` changes and
 * the bar goes away on its own — nothing has to notice and switch it off.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [startedAt, setStartedAt] = useState<string | null>(null)

  // Still on the page the click was made from, so the navigation is in flight.
  const active = startedAt !== null && startedAt === pathname

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Anything the browser handles itself: new tab, download, a modified
      // click, or a button other than the primary one.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // Same page: nothing will change, so nothing would ever switch it off.
      if (url.pathname === window.location.pathname) return

      setStartedAt(window.location.pathname)
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  if (!active) return null

  return (
    <div
      className={styles.track}
      // A live region would announce a bar that says nothing a screen reader
      // needs; navigation is already announced when the new page lands.
      aria-hidden="true"
    >
      <span className={styles.bar} />
    </div>
  )
}
