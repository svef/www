import Markdown from 'react-markdown'
import { Plus } from '@phosphor-icons/react/dist/ssr'
import type { PublicCategory, PublicChoice } from '@/lib/awards/public-catalog'
import type { Locale } from '@/lib/i18n'
import styles from './SubmissionCategories.module.scss'

/** The copy the cards need, so the component does not reach into the dictionary. */
export interface SubmissionCategoriesCopy {
  earlyBird: string
  regular: string
  currency: string
  description: string
  tiersTitle: string
  tiersNote: string
}

/** Markdown from the database: prose only, never a heading or an image. */
const ALLOWED = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br']

function Description({ text, label }: { text: string; label: string }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        <span className={styles.plus} aria-hidden="true">
          <Plus weight="bold" />
        </span>
        <span>{label}</span>
      </summary>
      <div className={styles.prose}>
        <Markdown allowedElements={ALLOWED} unwrapDisallowed>
          {text}
        </Markdown>
      </div>
    </details>
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
  const fmt = new Intl.NumberFormat(locale === 'is' ? 'is-IS' : 'en-GB')
  const money = (n: number) => `${fmt.format(n)} ${copy.currency}`
  return (
    <dl className={styles.prices}>
      <div className={styles.price}>
        <dt>{copy.earlyBird}</dt>
        <dd className={styles.early}>{money(category.earlyPrice)}</dd>
      </div>
      <div className={styles.price}>
        <dt>{copy.regular}</dt>
        <dd>{money(category.price)}</dd>
      </div>
    </dl>
  )
}

/**
 * The fifteen choices as cards: fourteen categories, and the Company Website group whose
 * four size tiers sit inside one card. Text and prices come from the awards database,
 * unchanged; a longer description opens in a native `<details>`, which is keyboard
 * operable and announced without any script.
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
      {choices.map((choice) =>
        choice.kind === 'group' ? (
          <li key={choice.slug} className={`${styles.card} ${styles.group}`} data-choice={choice.slug}>
            <h3 className={styles.name}>{choice.name[locale]}</h3>
            {choice.blurb && <p className={styles.blurb}>{choice.blurb[locale]}</p>}
            {choice.description && (
              <Description text={choice.description[locale]} label={copy.description} />
            )}
            <h4 className={styles.tiersTitle}>{copy.tiersTitle}</h4>
            <p className={styles.tiersNote}>{copy.tiersNote}</p>
            <ul className={styles.tiers}>
              {choice.tiers.map((tier) => (
                <li key={tier.slug} className={styles.tier} data-category={tier.slug}>
                  <h5 className={styles.tierName}>{tier.tierLabel?.[locale] ?? tier.name[locale]}</h5>
                  {tier.blurb && <p className={styles.blurb}>{tier.blurb[locale]}</p>}
                  <Prices category={tier} locale={locale} copy={copy} />
                </li>
              ))}
            </ul>
          </li>
        ) : (
          <li key={choice.slug} className={styles.card} data-choice={choice.slug} data-category={choice.slug}>
            <h3 className={styles.name}>{choice.name[locale]}</h3>
            {choice.blurb && <p className={styles.blurb}>{choice.blurb[locale]}</p>}
            {choice.description && (
              <Description text={choice.description[locale]} label={copy.description} />
            )}
            <Prices category={choice} locale={locale} copy={copy} />
          </li>
        ),
      )}
    </ul>
  )
}
