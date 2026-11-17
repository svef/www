import Link from 'next/link'
import { Logo } from '@/components/Logo/Logo'
import { LocaleToggle } from './LocaleToggle'
import { SiteNav, type HeaderNavItem } from './SiteNav'
import type { Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

export type { HeaderNavItem }

/**
 * The site header.
 *
 * It is not fixed and not sticky (#121): it sits at the top of the page, over the
 * first band, and scrolls away with it. There is no hide-on-scroll and no tone
 * sampling, so the colours are the ones the export shows at scroll position 0.
 * There, the first band's top-left corner is cut out in black around the page
 * title, which is what the mark and the first nav items sit on — hence the
 * violet `brand` mark, white nav text and a violet menu button.
 *
 * Stays a Server Component: the only part that needs the browser is the
 * navigation (the small-screen menu's open state and the current page), which
 * lives in `SiteNav`. The language toggle is passed through it as `children` so
 * it ends up inside the menu's focus trap without `SiteNav` importing it.
 */
export function Header({
  homeHref,
  navItems,
  menuLabel,
  closeLabel,
  submenuLabel,
  navLabel,
  email,
  locale,
}: {
  homeHref: string
  navItems: HeaderNavItem[]
  menuLabel: string
  closeLabel: string
  submenuLabel: string
  navLabel: string
  /** Shown in the foot of the small-screen menu. */
  email?: string
  locale: Locale
}) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <Link href={homeHref} className={styles.logoLink} aria-label="SVEF">
          <Logo size="var(--head-logo)" />
        </Link>
        <SiteNav
          items={navItems}
          menuLabel={menuLabel}
          closeLabel={closeLabel}
          submenuLabel={submenuLabel}
          navLabel={navLabel}
          email={email}
          locale={locale}
        >
          <LocaleToggle locale={locale} />
        </SiteNav>
      </div>
    </header>
  )
}
