'use client'

import { Check, Prohibit } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useMemo } from 'react'
import Markdown from 'react-markdown'
import { CATEGORIES, CATEGORY_GROUPS, type Category } from '@/lib/awards/categories'
import { blockedOptions } from '@/lib/awards/selection'
import type { Locale } from '@/lib/i18n'
import styles from './Categories.module.scss'
import { getProjectFormCopy } from './copy'
import { formatMoney, lastDayBefore } from './format'
import { priceBreakdown, type PriceLine } from './summary'
import type { ProjectFormApi } from './useProjectForm'

/** Markdown from the category texts: prose only, never a heading or an image. */
const ALLOWED = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br']

/**
 * A category's full description, always shown: people pick categories from these texts, so
 * hiding them behind a click makes wrong picks likelier. Collapsing is the exception on this site.
 */
function Description({ text }: { text: string }) {
  return (
    <div className={styles.prose}>
      <Markdown allowedElements={ALLOWED} unwrapDisallowed>
        {text}
      </Markdown>
    </div>
  )
}

/**
 * The first section: a choice card per option (fourteen categories and the Company
 * Website group), with the group's size tiers as a radio choice inside its card.
 * Options the current choice rules out are greyed with the reason, and a running
 * total shows both prices. The rules are `blockedOptions` (the same ones the server
 * enforces) and `priceBreakdown`.
 */
export function CategoriesSection({ form, locale }: { form: ProjectFormApi; locale: Locale }) {
  const copy = getProjectFormCopy(locale)
  const { view } = form
  const selected = form.categories
  const blocked = useMemo(() => blockedOptions(selected), [selected])
  const breakdown = useMemo(
    () => priceBreakdown(selected, view.entries, view.earlyBird, view.serverNow),
    [selected, view.entries, view.earlyBird, view.serverNow],
  )
  const statusOf = (slug: string) => view.entries.find((e) => e.category === slug)?.status
  const toggle = (slug: string, on: boolean) =>
    void form.changeCategories(on ? [...selected, slug] : selected.filter((s) => s !== slug))
  // A submitted entry can't be dropped here: leaving it means withdrawing it.
  const pinned = (slug: string | undefined) => {
    const s = slug ? statusOf(slug) : undefined
    return s !== undefined && s !== 'draft' && s !== 'withdrawn'
  }
  const money = (n: number) => formatMoney(n, locale, copy.currency)
  const until = lastDayBefore(view.earlyBird.endsBefore, locale)

  const Prices = ({ line }: { line: PriceLine | undefined }) =>
    line && (
      <dl className={styles.prices}>
        {line.locked !== null ? (
          <div>
            <dt>{copy.priceLocked}</dt>
            <dd>{money(line.locked)}</dd>
          </div>
        ) : (
          <>
            <div>
              <dt>{copy.earlyBird}</dt>
              <dd className={styles.early}>{money(line.early)}</dd>
            </div>
            <div>
              <dt>{copy.regular}</dt>
              <dd>{money(line.regular)}</dd>
            </div>
          </>
        )}
      </dl>
    )

  // A chosen category's own line (with its locked price, once submitted); otherwise what it would cost.
  const quote = (c: Category) =>
    breakdown.lines.find((l) => l.slug === c.slug) ??
    priceBreakdown([c.slug], [], view.earlyBird, view.serverNow).lines[0]

  const standalone = CATEGORIES.filter((c) => !c.group)
  return (
    <fieldset className={styles.categories} disabled={form.readOnly}>
      <legend className={styles.srOnly}>{copy.sections.categories.title}</legend>
      <ul className={styles.cards}>
        {CATEGORY_GROUPS.map((g) => {
          const tiers = CATEGORIES.filter((c) => c.group === g.slug)
          const chosen = tiers.find((t) => selected.includes(t.slug))
          return (
            <li
              key={g.slug}
              className={clsx(styles.card, styles.groupCard)}
              data-choice={g.slug}
              data-selected={chosen ? '' : undefined}
            >
              <fieldset className={styles.cardFieldset}>
                <legend className={styles.name}>{g.name[locale]}</legend>
                {g.description && <Description text={g.description[locale]} />}
                <p className={styles.sizeTitle} id={`size-${g.slug}`}>
                  {copy.chooseSize}
                </p>
                <div role="radiogroup" aria-labelledby={`size-${g.slug}`}>
                  <ul className={styles.tiers}>
                    {tiers.map((t) => {
                      const line = quote(t)
                      return (
                        <li key={t.slug} className={styles.tier} data-category={t.slug}>
                          <label className={styles.tierChoice}>
                            <input
                              className={styles.input}
                              type="radio"
                              name={`tier-${g.slug}`}
                              checked={chosen?.slug === t.slug}
                              disabled={pinned(chosen?.slug) && chosen?.slug !== t.slug}
                              onChange={() =>
                                void form.changeCategories([
                                  ...selected.filter((s) => !tiers.some((x) => x.slug === s)),
                                  t.slug,
                                ])
                              }
                            />
                            <span className={styles.radio} aria-hidden="true" />
                            <span className={styles.tierName}>
                              {t.tierLabel?.[locale] ?? t.name[locale]}
                            </span>
                          </label>
                          {t.blurb && <p className={styles.blurb}>{t.blurb[locale]}</p>}
                          <Prices line={line} />
                        </li>
                      )
                    })}
                  </ul>
                </div>
                {chosen && pinned(chosen.slug) && <p className={styles.note}>{copy.pinned}</p>}
                {chosen && !pinned(chosen.slug) && (
                  <button
                    type="button"
                    className={styles.clear}
                    data-clear-group
                    onClick={() => toggle(chosen.slug, false)}
                  >
                    {copy.clearGroup(g.name[locale])}
                  </button>
                )}
              </fieldset>
            </li>
          )
        })}
        {standalone.map((c) => {
          const why = blocked[c.slug]
          const checked = selected.includes(c.slug)
          const whyId = `why-${c.slug}`
          const blurbId = `blurb-${c.slug}`
          const status = statusOf(c.slug)
          return (
            <li
              key={c.slug}
              className={clsx(styles.card, why && styles.blocked)}
              data-choice={c.slug}
              data-selected={checked ? '' : undefined}
              data-blocked={why ? '' : undefined}
            >
              <label className={styles.choice}>
                <input
                  className={styles.input}
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(why) || (checked && pinned(c.slug))}
                  aria-describedby={
                    [c.blurb ? blurbId : null, why ? whyId : null].filter(Boolean).join(' ') ||
                    undefined
                  }
                  onChange={(e) => toggle(c.slug, e.target.checked)}
                />
                <span className={styles.name}>{c.name[locale]}</span>
                <span className={styles.mark} aria-hidden="true">
                  <Check weight="bold" />
                </span>
              </label>
              {checked && status && status !== 'draft' && (
                <p className={styles.status}>{copy.status[status]}</p>
              )}
              {c.blurb && (
                <p id={blurbId} className={styles.blurb}>
                  {c.blurb[locale]}
                </p>
              )}
              {c.description && <Description text={c.description[locale]} />}
              {why && (
                <p id={whyId} className={styles.why}>
                  <Prohibit aria-hidden="true" weight="bold" />
                  <span>{why.message[locale] || copy.blockedBecause}</span>
                </p>
              )}
              <Prices line={quote(c)} />
            </li>
          )
        })}
      </ul>

      {form.categoryError && (
        <p className={styles.error} role="alert">
          {form.categoryError.message || copy.categoryError}
        </p>
      )}

      <div className={styles.total} role="status" aria-live="polite" data-total>
        <h3 className={styles.totalTitle}>{copy.totalTitle}</h3>
        {breakdown.lines.length === 0 ? (
          <p className={styles.totalNote}>{copy.totalEmpty}</p>
        ) : (
          <>
            <dl className={clsx(styles.prices, styles.totalPrices)}>
              <div>
                <dt>{copy.earlyBird}</dt>
                <dd className={styles.early} data-total-early>
                  {money(breakdown.totalEarly)}
                </dd>
              </div>
              <div>
                <dt>{copy.regular}</dt>
                <dd data-total-regular>{money(breakdown.totalRegular)}</dd>
              </div>
            </dl>
            <p className={styles.totalNote}>
              {breakdown.earlyAvailable
                ? copy.totalEarlyOpen(until)
                : copy.totalEarlyClosed}
            </p>
          </>
        )}
      </div>
    </fieldset>
  )
}
