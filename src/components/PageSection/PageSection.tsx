import clsx from 'clsx'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import styles from './PageSection.module.scss'

interface PageSectionProps extends Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  /**
   * The last section on the page: adds the space between it and the footer (the export's
   * `.page` bottom padding).
   */
  last?: boolean
  children: ReactNode
}

/**
 * A content section under a band (the export's `.sec.wrap`): the page gutter and the
 * generous space above that separates it from the band before it. Name it with
 * `aria-labelledby` when it has a heading, or leave it unnamed when it is just the page's body.
 */
export function PageSection({
  last = false,
  className,
  children,
  ...rest
}: PageSectionProps) {
  return (
    <section className={clsx(styles.section, last && styles.last, className)} {...rest}>
      {children}
    </section>
  )
}
