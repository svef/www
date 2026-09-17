import { Button } from '@/components/Button/Button'
import styles from './awards.module.scss'

export interface CeremonyBlockProps {
  /** Small violet label above the heading — "HÁTÍÐIN 2026". */
  eyebrow: string
  /** "14. nóvember í Hörpu". */
  headline: string
  /** Language of `headline`, when it is not the page's. */
  headlineLang?: string
  /** ISO instant of the ceremony, for `<time dateTime>` on the heading. */
  ceremonyDate: string
  /**
   * The two facts under the heading: the submission deadline and when tickets go
   * on sale. Either can be missing — the board fixes them at different times of
   * year — and the block simply prints the ones it has.
   */
  lines: readonly string[]
  submit?: { label: string; href: string } | null
  tickets?: { label: string; href: string } | null
}

/**
 * The white ceremony panel: when and where the next awards night is, how long
 * there is left to enter, and the two things a reader can do about it.
 *
 * A button is rendered only when the edition carries a URL for it. The design
 * draws both as `href="#"`, and a call to action that goes nowhere is the exact
 * failure the old archive had — `e2e/known-links.ts` exists to stop it coming
 * back. Both are external destinations (an entry form, a ticket shop), so they
 * are plain anchors rather than `next/link` routes.
 */
export function CeremonyBlock({
  eyebrow,
  headline,
  headlineLang,
  ceremonyDate,
  lines,
  submit,
  tickets,
}: CeremonyBlockProps) {
  return (
    <section className={styles.ceremonySection}>
      <div className={styles.ceremonyWrap}>
        {/* The export's single violet block, hung off the panel's top-right
            corner. Decorative, so it is hidden rather than announced. */}
        <span className={styles.ceremonyMotif} aria-hidden="true" />
        <div className={styles.ceremony}>
          <div>
            <p className={styles.ceremonyEyebrow}>{eyebrow}</p>
            <h2 className={styles.ceremonyTitle} lang={headlineLang}>
              <time dateTime={ceremonyDate}>{headline}</time>
            </h2>
            {lines.map((line) => (
              <p key={line} className={styles.ceremonyLine}>
                {line}
              </p>
            ))}
          </div>
          {(submit || tickets) && (
            <div className={styles.ceremonyActions}>
              {submit && (
                <Button href={submit.href} className={styles.ceremonyCta}>
                  {submit.label}
                </Button>
              )}
              {tickets && (
                <Button
                  href={tickets.href}
                  variant="secondary"
                  className={styles.ceremonyCtaGhost}
                >
                  {tickets.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
