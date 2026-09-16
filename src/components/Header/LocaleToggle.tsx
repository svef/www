'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { localePath, type Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

/**
 * Link to the current page in the other locale.
 *
 * The layout is a Server Component, so the current path has to come from a
 * client hook. `usePathname()` reports the internally rewritten path (`/is/...`)
 * while prerendering and the visible path (`/...`) in the browser; `localePath`
 * normalises both to the same visible href, so the markup matches on hydration.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const target: Locale = locale === 'en' ? 'is' : 'en'
  const label = target.toUpperCase()

  return (
    <Link
      href={localePath(pathname, target)}
      className={styles.langPill}
      hrefLang={target}
    >
      <span aria-hidden="true">🌐</span> {label}
    </Link>
  )
}
