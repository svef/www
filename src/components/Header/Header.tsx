import Link from 'next/link'
import { Logo } from '@/components/Logo/Logo'
import { LocaleToggle } from './LocaleToggle'
import type { Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

export interface HeaderNavItem {
  href: string
  label: string
}

export function Header({
  homeHref,
  navItems,
  contactLabel,
  contactHref,
  locale,
}: {
  homeHref: string
  navItems: HeaderNavItem[]
  contactLabel: string
  contactHref: string
  locale: Locale
}) {
  return (
    <header className={styles.header}>
      <Link href={homeHref} className={styles.logoLink} aria-label="SVEF">
        <Logo />
      </Link>
      <nav aria-label="Primary" className={styles.nav}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={styles.navLink}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.utility}>
        <Link href={contactHref} className={styles.navLink}>
          {contactLabel}
        </Link>
        <LocaleToggle locale={locale} />
      </div>
    </header>
  )
}
