import { Button } from '@/components/Button/Button'
import styles from './awards.module.scss'

export interface CeremonyBlockProps {
  /** Small violet label above the heading — "HÁTÍÐIN 2026". */
  eyebrow: string
  /** "14. nóvember í Hörpu". */
  headline: string
  /** Language of `headline`, when it is not the page's. */
  headlineLang?: string
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
 * A button is rendered only when the edition carries a URL for it, and the dev
 * fixtures deliberately carry neither — the export draws both calls to action as
 * bare `<button>` elements with no destination, so there is none to transcribe.
 * A call to action that goes nowhere is the exact failure the old archive had,
 * and `e2e/known-links.ts` exists to stop it coming back.
 *
 * There is no `<time dateTime>` on the heading. `headline` is free text whose
 * entire justification is that it is prose an editor writes — "Tuttugasta
 * hátíðin" is a perfectly good heading — and wrapping that in a
 * machine-readable timestamp would mark a sentence up as a date. The
 * ceremony's own instant stays on the `award-editions` document.
 *
 * Both calls to action go through `<Button href>`, which renders `next/link`. That is fine for
 * an off-site destination — Next leaves an absolute URL alone — and it is what
 * every other call to action on the site uses, so they stay consistent rather
 * than being special-cased.
 */
export function CeremonyBlock({
  eyebrow,
  headline,
  headlineLang,
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
              {headline}
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
