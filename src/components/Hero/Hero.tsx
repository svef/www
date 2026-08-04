import { Eyebrow } from '@/components/Eyebrow/Eyebrow'
import { Button } from '@/components/Button/Button'
import { BlockMotif } from '@/components/BlockMotif/BlockMotif'
import styles from './Hero.module.scss'

interface Cta {
  label: string
  href: string
}

export function Hero({
  eyebrow,
  title,
  lead,
  primary,
  secondary,
}: {
  eyebrow?: string
  title: string
  lead?: string
  primary?: Cta
  secondary?: Cta
}) {
  return (
    <section className={styles.hero}>
      <BlockMotif className={styles.motifLeft} tone="mixed" />
      <BlockMotif className={styles.motifRight} />
      <div className={styles.inner}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className={styles.title}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
        {(primary || secondary) && (
          <div className={styles.ctas}>
            {primary && <Button href={primary.href}>{primary.label}</Button>}
            {secondary && (
              <Button variant="secondary" href={secondary.href}>
                {secondary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
