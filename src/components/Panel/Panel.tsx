import clsx from 'clsx'
import type { ReactNode } from 'react'
import { BlockMotif } from '@/components/BlockMotif/BlockMotif'
import styles from './Panel.module.scss'

// White "spotlight" panel on the dark canvas, framed by the block motif.
export function Panel({
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
    <div className={clsx(styles.wrap, className)}>
      <BlockMotif className={styles.motif} tone="mixed" />
      <div className={styles.panel}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        {title && <h2 className={styles.title}>{title}</h2>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
