import clsx from 'clsx'
import styles from './BlockMotif.module.scss'

// The brand's signature: a cluster of violet blocks (one with a corner cut),
// used decoratively at section edges. Purely visual → aria-hidden.
export function BlockMotif({
  className,
  tone = 'violet',
}: {
  className?: string
  tone?: 'violet' | 'mixed'
}) {
  return (
    <span className={clsx(styles.motif, className)} aria-hidden="true">
      <span className={styles.block} />
      <span className={clsx(styles.block, styles.cut)} />
      {tone === 'mixed' && <span className={clsx(styles.block, styles.dark)} />}
    </span>
  )
}
