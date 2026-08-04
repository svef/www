import { Eyebrow } from '@/components/Eyebrow/Eyebrow'
import { Button } from '@/components/Button/Button'
import styles from './SpotlightRow.module.scss'

interface Cta {
  label: string
  href: string
}

// Text + spotlight image panel (the "happening now" pattern from the design).
export function SpotlightRow({
  eyebrow,
  title,
  body,
  primary,
  secondary,
}: {
  eyebrow?: string
  title: string
  body?: string
  primary?: Cta
  secondary?: Cta
}) {
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className={styles.title}>{title}</h2>
        {body && <p className={styles.body}>{body}</p>}
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
      <div className={styles.panel} aria-hidden="true" />
    </div>
  )
}
