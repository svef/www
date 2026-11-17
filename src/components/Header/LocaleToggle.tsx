'use client'

import { useCallback, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { VisuallyHidden } from '@mantine/core'
import { GrowText } from '@/components/GrowText/GrowText'
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
/**
 * A single link to the other language, drawn as the export's `IS/EN` button and
 * named, for assistive technology, with that language's own name.
 *
 * "English" on the Icelandic page, "Íslenska" on the English page — written in
 * the language it leads to, so a reader who cannot read the page they are on can
 * still recognise the way out. One item rather than a pair: there are only two
 * languages, so the current one does not need stating, and a lone word sits on
 * the nav's line instead of looking like a control dropped beside it.
 *
 * The hidden phrase begins with the letters drawn on the button (`IS` on the
 * desktop chip, `IS` and `EN` on the phone switch, so `IS/EN` covers both) and then
 * says what the link does, so the accessible name contains the visible label
 * (WCAG 2.5.3 Label in Name).
 *
 * The href preserves the page you are on, carrying the query and hash with it;
 * see `useLocationSuffix` above for why those are read from `window.location`.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const suffix = useLocationSuffix()
  const t = getDictionary(locale)
  const target: Locale = locale === 'is' ? 'en' : 'is'

  return (
    <Link
      href={localePath(pathname + suffix, target)}
      className={styles.langLink}
      hrefLang={target}
    >
      {/* Decoration: the link's name is the hidden text below. */}
      <span className={styles.langCurrent} aria-hidden="true">
        <GrowText className={styles.langText}>{locale.toUpperCase()}</GrowText>
      </span>
      <span className={styles.langSeg} aria-hidden="true">
        <b data-on={locale === 'is'}>IS</b>
        <b data-on={locale === 'en'}>EN</b>
      </span>
      <VisuallyHidden>
        {/* Starts with what is drawn: the chip shows the current code, the phone switch both. */}
        <span lang="en">IS/EN</span>,{' '}
        <span lang={target}>{getDictionary(target).languageName}</span>.{' '}
        {t.switchLanguage}
      </VisuallyHidden>
    </Link>
  )
}
