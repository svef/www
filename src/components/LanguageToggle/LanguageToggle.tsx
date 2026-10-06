import Link from 'next/link'
import type { Locale } from '@/lib/i18n'
import styles from './LanguageToggle.module.scss'

// A two-item switch rather than a dropdown: there are exactly two languages, so
// both fit on screen and neither needs a click to discover. The current language
// stays visible and is marked with `aria-current` instead of being removed, so
// the control doesn't change shape between locales.
export function LanguageToggle({
  locale,
  label,
  names,
}: {
  locale: Locale
  label: string
  names: { is: string; en: string }
}) {
  return (
    <nav className={styles.toggle} aria-label={label}>
      <Link
        className={styles.option}
        href="/is"
        hrefLang="is"
        lang="is"
        aria-current={locale === 'is' ? 'page' : undefined}
      >
        {names.is}
      </Link>
      <span className={styles.divider} aria-hidden="true" />
      <Link
        className={styles.option}
        href="/en"
        hrefLang="en"
        lang="en"
        aria-current={locale === 'en' ? 'page' : undefined}
      >
        {names.en}
      </Link>
    </nav>
  )
}
