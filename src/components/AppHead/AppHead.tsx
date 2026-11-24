import clsx from 'clsx'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { GrowText } from '@/components/GrowText/GrowText'
import styles from './AppHead.module.scss'

export interface AppHeadProps {
  /** The page's `<h1>`. */
  title: string
  /** `lang` of the title, when it is not the page's (an entrant's own project title). */
  titleLang?: string
  /** Small label above the title, e.g. "Vefverðlaunin 2026". */
  eyebrow?: ReactNode
  /** Link back to the parent page, above the eyebrow. */
  crumb?: { href: string; label: string; ariaLabel?: string }
  /** One or two sentences under the title. */
  lede?: string
  /** Beside the title on wide screens, under it on phones: the page's main actions or status. */
  actions?: ReactNode
  className?: string
}

/**
 * The page head for the signed-in awards screens (dashboard, project form, staff area). The
 * public pages open with `PageHead`'s full-height violet band; once someone is signed in and
 * working, the page should get out of the way, so this is the calm version: dark canvas, a
 * small violet block before the eyebrow (the brand's block motif, as punctuation), a title at
 * section size, and a hairline under it.
 *
 * The site header overlays the top of the page, so the head carries the padding that clears it.
 */
export function AppHead({ title, titleLang, eyebrow, crumb, lede, actions, className }: AppHeadProps) {
  return (
    <header className={clsx(styles.head, className)}>
      <div className={styles.wrap}>
        <div className={styles.text}>
          {crumb && (
            <Link className={styles.crumb} href={crumb.href} aria-label={crumb.ariaLabel}>
              <GrowText>{crumb.label}</GrowText>
            </Link>
          )}
          {eyebrow && <p className={clsx('no-condense', styles.eyebrow)}>{eyebrow}</p>}
          <h1 lang={titleLang}>{title}</h1>
          {lede && <p className={styles.lede}>{lede}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  )
}
