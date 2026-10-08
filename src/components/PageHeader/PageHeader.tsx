import { Eyebrow } from '@/components/Eyebrow/Eyebrow'
import styles from './PageHeader.module.scss'

// Shared page header: eyebrow + big heading + lead, with the block motif.
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string
  title: string
  lead?: string
}) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className={styles.title}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
    </header>
  )
}
