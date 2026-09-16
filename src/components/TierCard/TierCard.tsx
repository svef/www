import clsx from 'clsx'
import { Button } from '@/components/Button/Button'
import styles from './TierCard.module.scss'

export interface TierCardProps {
  name: string
  price: string
  priceNote?: string
  benefits: string[]
  ctaLabel: string
  ctaHref: string
  featured?: boolean
  /**
   * Heading level for the tier name. Defaults to 2 — the tier grid on /skraning
   * sits directly under the page <h1> with no section heading in between.
   */
  headingLevel?: 2 | 3 | 4
}

export function TierCard({
  name,
  price,
  priceNote,
  benefits,
  ctaLabel,
  ctaHref,
  featured,
  headingLevel = 2,
}: TierCardProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <div className={clsx(styles.card, featured && styles.featured)}>
      <Heading className={styles.name}>{name}</Heading>
      <p className={styles.price}>
        {price}
        {priceNote && <span className={styles.note}> {priceNote}</span>}
      </p>
      <ul className={styles.benefits}>
        {benefits.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <Button href={ctaHref} variant={featured ? 'primary' : 'secondary'}>
        {ctaLabel}
      </Button>
    </div>
  )
}
