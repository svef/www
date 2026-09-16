'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { VisuallyHidden } from '@mantine/core'
import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

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
 * Known limitation: `usePathname()` excludes the query string and the hash, so
 * neither survives the switch. Tracked in issue #49.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const target: Locale = locale === 'en' ? 'is' : 'en'
  const t = getDictionary(locale)

  return (
    <Link
      href={localePath(pathname, target)}
      className={styles.langPill}
      hrefLang={target}
    >
      <span aria-hidden="true">🌐</span>{' '}
      <span lang={target}>{target.toUpperCase()}</span>
      <VisuallyHidden> {t.switchLanguage}</VisuallyHidden>
    </Link>
  )
}
