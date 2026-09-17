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
  titleLang,
  leadLang,
}: {
  eyebrow?: string
  title: string
  lead?: string
  primary?: Cta
  secondary?: Cta
  /**
   * Language of the title, when it is not the page's.
   *
   * The home page's `<h1>` is a localized field on the `home-page` global, so
   * on `/en` it is Icelandic until someone writes the English. Marking it is
   * what stops a screen reader reading Icelandic in an English voice.
   */
  titleLang?: string
  /** Language of the lead paragraph, when it is not the page's. Localized separately. */
  leadLang?: string
}) {
  return (
    <section className={styles.hero}>
      <BlockMotif className={styles.motifLeft} tone="mixed" />
      <BlockMotif className={styles.motifRight} />
      <div className={styles.inner}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className={styles.title} lang={titleLang}>
          {title}
        </h1>
        {lead && (
          <p className={styles.lead} lang={leadLang}>
            {lead}
          </p>
        )}
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
