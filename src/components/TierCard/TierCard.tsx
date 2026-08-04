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
}

export function TierCard({
  name,
  price,
  priceNote,
  benefits,
  ctaLabel,
  ctaHref,
  featured,
}: TierCardProps) {
  return (
    <div className={clsx(styles.card, featured && styles.featured)}>
      <h3 className={styles.name}>{name}</h3>
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
