import Link from 'next/link'
import { Shape } from '@/components/Shape/Shape'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import type { IntakePhase } from '@/lib/awards/public-catalog'
import styles from './SubmissionCta.module.scss'

export interface SubmissionCtaProps {
  phase: IntakePhase
  title: string
  /** What the panel says for the current phase. */
  message: string
  /** Sign-up and sign-in, only while intake is open. */
  actions?: { startLabel: string; startHref: string; hasAccount: string; signInLabel: string; signInHref: string }
  headingId: string
}

/**
 * The "Start a submission" panel. While intake is open it links to sign-up and
 * sign-in; before it opens and after it closes it says so and links nowhere,
 * because there is nothing yet (or any more) to start.
 */
export function SubmissionCta({ phase, title, message, actions, headingId }: SubmissionCtaProps) {
  return (
    <Shape color="white" auto="tr,bl" className={styles.panel} data-phase={phase}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <p className={styles.message}>{message}</p>
      {phase === 'open' && actions && (
        <div className={styles.actions}>
          <ButtonLink href={actions.startHref} size="large">
            {actions.startLabel}
          </ButtonLink>
          <p className={styles.account}>
            {actions.hasAccount} <Link href={actions.signInHref}>{actions.signInLabel}</Link>
          </p>
        </div>
      )}
    </Shape>
  )
}
