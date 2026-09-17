'use client'

import { useCallback, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { VisuallyHidden } from '@mantine/core'
import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

/**
 * The live `?query#hash` of the address bar, or `''` before hydration.
 *
 * Neither is available on the server: `usePathname()` excludes both, and the
 * hash is never sent to the server at all. `useSearchParams()` would supply the
 * query, but not without cost — see `LocaleToggle` below. `window.location` has
 * both, so one client-side read covers them together.
 *
 * `getServerSnapshot` returns `''` so the prerendered markup and the first
 * client render agree; React swaps in the real value immediately after
 * hydration. The subscription covers in-page anchor clicks and Back/Forward;
 * router navigations re-render this component anyway, and `getSnapshot` is
 * re-read on every render, so those are picked up without a listener.
 */
function useLocationSuffix(): string {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.location.search + window.location.hash,
    () => '',
  )
}

/**
 * Link to the current page in the other locale.
 *
 * The layout is a Server Component, so the current path has to come from a
 * client hook. `usePathname()` returns the internally rewritten path (`/is/...`)
 * whenever the value was produced on the server — during prerendering, and still
 * after a hard load, because hydration reuses the server-rendered value. It
 * returns the visible path (`/...`) only once a client-side navigation has
 * happened. Anything reading it (active-nav highlighting, for instance) has to
 * cope with both forms; `localePath` normalises them to the same visible href,
 * so the markup matches on hydration.
 *
 * `usePathname()` also excludes the query string and the hash (#49). Both are
 * restored from `window.location` after mount rather than from
 * `useSearchParams()`, which reaches only the query and is expensive here: this
 * component sits in the layout, so on Next 16 an unwrapped call fails the build
 * outright, and wrapping it in `<Suspense>` prerenders the fallback instead of
 * the link — the toggle would be missing from the static HTML of every page and
 * would never appear without JavaScript. Reading `window.location` keeps the
 * real link in the prerendered markup and upgrades the href once hydrated.
 *
 * The consequence is that with JavaScript off the toggle preserves the path but
 * not the query or the hash. That is unavoidable for the hash, which the server
 * never receives, and it is what the toggle already did before #49.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const suffix = useLocationSuffix()
  const target: Locale = locale === 'en' ? 'is' : 'en'
  const t = getDictionary(locale)

  return (
    <Link
      href={localePath(pathname + suffix, target)}
      className={styles.langPill}
      hrefLang={target}
    >
      <span aria-hidden="true">🌐</span>{' '}
      <span lang={target}>{target.toUpperCase()}</span>
      <VisuallyHidden> {t.switchLanguage}</VisuallyHidden>
    </Link>
  )
}
