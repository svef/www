import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/Eyebrow/Eyebrow'
import styles from './Section.module.scss'

export function Section({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx(styles.section, className)}>
      <div className={styles.inner}>
        {(eyebrow || title) && (
          <header className={styles.head}>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && <h2 className={styles.title}>{title}</h2>}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}
