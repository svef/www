import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './SectionHead.module.scss'

export interface SectionHeadProps {
  /** The section's `<h2>`. */
  title: string
  /** `id` for the heading, so the section can name itself with `aria-labelledby`. */
  id?: string
  /** `lang` of the title, when it is not the page's. */
  titleLang?: string
  /** Put the title on the right, as the export's brand-kit head does (`.sec-head-r`). */
  right?: boolean
  /** Anything beside the title, e.g. an "Icelandic only" marker. */
  children?: ReactNode
}

/** A section's heading row (the export's `.sec-head` with `.h2`). */
export function SectionHead({
  title,
  id,
  titleLang,
  right = false,
  children,
}: SectionHeadProps) {
  return (
    <div className={clsx(styles.head, right && styles.right)}>
      <h2 id={id} lang={titleLang} className={styles.title}>
        {title}
      </h2>
      {children}
    </div>
  )
}
