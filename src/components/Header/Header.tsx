import Link from 'next/link'
import { Logo } from '@/components/Logo/Logo'
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
  otherLocaleHref,
  otherLocaleLabel,
}: {
  homeHref: string
  navItems: HeaderNavItem[]
  contactLabel: string
  contactHref: string
  otherLocaleHref: string
  otherLocaleLabel: string
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
        <Link
          href={otherLocaleHref}
          className={styles.langPill}
          hrefLang={otherLocaleLabel.toLowerCase()}
        >
          <span aria-hidden="true">🌐</span> {otherLocaleLabel}
        </Link>
      </div>
    </header>
  )
}
