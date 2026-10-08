import Link from 'next/link'
import { Logo } from '@/components/Logo/Logo'
import { HeaderShell } from './HeaderShell'
import { LocaleToggle } from './LocaleToggle'
import { SiteNav, type HeaderNavItem } from './SiteNav'
import type { Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

export type { HeaderNavItem }

/**
 * The site header.
 *
 * Stays a Server Component: the only thing on it that needs the browser is the
 * navigation — the small-screen menu's open state, and which item is the
 * current page — and that lives in `SiteNav`. The language toggle is passed
 * through `SiteNav` as `children` so it ends up inside the menu's focus trap
 * without `SiteNav` importing it.
 */
export function Header({
  homeHref,
  navItems,
  menuLabel,
  navLabel,
  locale,
}: {
  homeHref: string
  navItems: HeaderNavItem[]
  menuLabel: string
  navLabel: string
  locale: Locale
}) {
  return (
    <HeaderShell>
      <div className={styles.inner}>
        <Link href={homeHref} className={styles.logoLink} aria-label="SVEF">
          <Logo />
        </Link>
        <SiteNav items={navItems} menuLabel={menuLabel} navLabel={navLabel} locale={locale}>
          <LocaleToggle locale={locale} />
        </SiteNav>
      </div>
    </HeaderShell>
  )
}
