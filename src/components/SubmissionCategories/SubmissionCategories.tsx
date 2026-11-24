import Markdown from 'react-markdown'
import type { PublicCategory, PublicChoice } from '@/lib/awards/public-catalog'
import type { Locale } from '@/lib/i18n'
import styles from './SubmissionCategories.module.scss'
import { formatKr } from '@/lib/locale-format'

/** The copy the grid needs, so the component does not reach into the dictionary. */
export interface SubmissionCategoriesCopy {
  earlyBird: string
  regular: string
  currency: string
  tiersTitle: string
  tiersNote: string
}

/** Markdown from the database: prose only, never a heading or an image. */
const ALLOWED = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br']

function Description({ text }: { text: string }) {
  return (
    <div className={styles.prose} data-description>
      <Markdown allowedElements={ALLOWED} unwrapDisallowed>
        {text}
      </Markdown>
    </div>
  )
}

function Prices({
  category,
  locale,
  copy,
}: {
  category: Pick<PublicCategory, 'price' | 'earlyPrice'>
  locale: Locale
  copy: SubmissionCategoriesCopy
}) {
  const money = (n: number) => formatKr(n, locale, copy.currency)
  return (
    <dl className={styles.prices}>
      <div className={`${styles.price} ${styles.early}`}>
        <dt>{copy.earlyBird}</dt>
        <dd>{money(category.earlyPrice)}</dd>
      </div>
      <div className={styles.price}>
        <dt>{copy.regular}</dt>
        <dd>{money(category.price)}</dd>
      </div>
    </dl>
  )
}

const num = (i: number) => String(i + 1).padStart(2, '0')

/**
 * The fifteen choices as the redesign's numbered category grid (`.cats2`): hairline cells,
 * a number in the cell's accent and a stepped mark as punctuation. Each cell gives the
 * name, the short blurb as its subtitle, the longer description in full (no disclosure: it is
 * what an entrant needs to choose), and the two prices. The Company Website group spans the
 * grid and holds its four size tiers, of which an entrant picks one. Text and prices come from
 * the awards database, unchanged.
 */
export function SubmissionCategories({
  choices,
  locale,
  copy,
  label,
}: {
  choices: PublicChoice[]
  locale: Locale
  copy: SubmissionCategoriesCopy
  label: string
}) {
  return (
    <ul className={styles.list} aria-label={label}>
      {choices.map((choice, i) =>
        choice.kind === 'group' ? (
          <li key={choice.slug} className={`${styles.cell} ${styles.group}`} data-choice={choice.slug}>
            <span className={styles.num} aria-hidden="true">
              {num(i)}
            </span>
            <div className={styles.text}>
              <h3 className={styles.name}>{choice.name[locale]}</h3>
              {choice.blurb && <p className={styles.blurb}>{choice.blurb[locale]}</p>}
              {choice.description && <Description text={choice.description[locale]} />}
            </div>
            <div className={styles.tiersBlock}>
              <h4 className={styles.tiersTitle}>{copy.tiersTitle}</h4>
              <p className={styles.tiersNote}>{copy.tiersNote}</p>
              <ul className={styles.tiers}>
                {choice.tiers.map((tier) => (
                  <li key={tier.slug} className={styles.tier} data-category={tier.slug}>
                    <h5 className={styles.tierName}>{tier.tierLabel?.[locale] ?? tier.name[locale]}</h5>
                    {tier.blurb && <p className={styles.tierBlurb}>{tier.blurb[locale]}</p>}
                    {tier.description && <Description text={tier.description[locale]} />}
                    <Prices category={tier} locale={locale} copy={copy} />
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ) : (
          <li key={choice.slug} className={styles.cell} data-choice={choice.slug} data-category={choice.slug}>
            <span className={styles.num} aria-hidden="true">
              {num(i)}
            </span>
            <div className={styles.text}>
              <h3 className={styles.name}>{choice.name[locale]}</h3>
              {choice.blurb && <p className={styles.blurb}>{choice.blurb[locale]}</p>}
              {choice.description && <Description text={choice.description[locale]} />}
            </div>
            <Prices category={choice} locale={locale} copy={copy} />
          </li>
        ),
      )}
    </ul>
  )
}
