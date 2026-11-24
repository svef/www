'use client'

import { Check, Prohibit } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useMemo } from 'react'
import Markdown from 'react-markdown'
import { CATEGORIES, CATEGORY_GROUPS, type Category } from '@/lib/awards/categories'
import { blockedOptions } from '@/lib/awards/selection'
import { Step } from '@/components/FormParts/FormParts'
import type { Locale } from '@/lib/i18n'
import styles from './Categories.module.scss'
import { getProjectFormCopy } from './copy'
import { formatMoney, lastDayBefore } from './format'
import { blockNum } from './sections'
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

/** Both prices, or the locked one. */
function Prices({
  line,
  locale,
  className,
  attrs,
}: {
  line: PriceLine | undefined
  locale: Locale
  className?: string
  attrs?: { early: Record<string, string>; regular: Record<string, string> }
}) {
  const copy = getProjectFormCopy(locale)
  const money = (n: number) => formatMoney(n, locale, copy.currency)
  if (!line) return null
  return (
    <dl className={clsx(styles.prices, className)}>
      {line.locked !== null ? (
        <div>
          <dt>{copy.priceLocked}</dt>
          <dd>{money(line.locked)}</dd>
        </div>
      ) : (
        <>
          <div>
            <dt>{copy.earlyBird}</dt>
            <dd className={styles.early} {...attrs?.early}>
              {money(line.early)}
            </dd>
          </div>
          <div>
            <dt>{copy.regular}</dt>
            <dd {...attrs?.regular}>{money(line.regular)}</dd>
          </div>
        </>
      )}
    </dl>
  )
}

/**
 * The running total, both prices. It rides in the step's sticky bottom bar, next to
 * Previous/Next, so it stays in sight while choosing (one bar, never two).
 */
export function CategoryTotal({
  form,
  locale,
}: {
  form: ProjectFormApi
  locale: Locale
}) {
  const copy = getProjectFormCopy(locale)
  const { view } = form
  const breakdown = useMemo(
    () => priceBreakdown(form.categories, view.entries, view.earlyBird, view.serverNow),
    [form.categories, view.entries, view.earlyBird, view.serverNow],
  )
  const until = lastDayBefore(view.earlyBird.endsBefore, locale)
  return (
    <div className={styles.total} role="status" aria-live="polite" data-total>
      <p className={styles.totalTitle}>{copy.totalTitle}</p>
      {breakdown.lines.length === 0 ? (
        <p className={styles.totalNote}>{copy.totalEmpty}</p>
      ) : (
        <>
          <Prices
            locale={locale}
            className={styles.totalPrices}
            line={{
              slug: '',
              early: breakdown.totalEarly,
              regular: breakdown.totalRegular,
              locked: null,
            }}
            attrs={{
              early: { 'data-total-early': '' },
              regular: { 'data-total-regular': '' },
            }}
          />
          <p className={styles.totalNote}>
            {breakdown.earlyAvailable
              ? copy.totalEarlyOpen(until)
              : copy.totalEarlyClosed}
          </p>
        </>
      )}
    </div>
  )
}

/**
 * The first section: a choice card per option (fourteen categories and the Company
 * Website group), with the group's size tiers as a radio choice inside its card.
 * Options the current choice rules out are greyed with the reason; the running total is
 * in the step's bottom bar (`CategoryTotal`). Numbered blocks: one per group (the size
 * choice), then the other categories. The rules are `blockedOptions` (the same ones the
 * server enforces) and `priceBreakdown`.
 */
export function CategoriesSection({
  form,
  locale,
}: {
  form: ProjectFormApi
  locale: Locale
}) {
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
    void form.changeCategories(
      on ? [...selected, slug] : selected.filter((s) => s !== slug),
    )
  // A submitted entry can't be dropped here: leaving it means withdrawing it.
  const pinned = (slug: string | undefined) => {
    const s = slug ? statusOf(slug) : undefined
    return s !== undefined && s !== 'draft' && s !== 'withdrawn'
  }
  // A chosen category's own line (with its locked price, once submitted); otherwise what it would cost.
  const quote = (c: Category) =>
    breakdown.lines.find((l) => l.slug === c.slug) ??
    priceBreakdown([c.slug], [], view.earlyBird, view.serverNow).lines[0]

  const standalone = CATEGORIES.filter((c) => !c.group)
  return (
    <fieldset className={styles.categories} disabled={form.readOnly}>
      <legend className={styles.srOnly}>{copy.sections.categories.title}</legend>
      {CATEGORY_GROUPS.map((g, gi) => {
        const tiers = CATEGORIES.filter((c) => c.group === g.slug)
        const chosen = tiers.find((t) => selected.includes(t.slug))
        return (
          <Step
            key={g.slug}
            num={blockNum(gi + 1)}
            title={g.name[locale]}
            titleId={`group-${g.slug}`}
          >
            <ul className={styles.cards}>
              <li
                key={g.slug}
                className={clsx(styles.card, styles.groupCard)}
                data-choice={g.slug}
                data-selected={chosen ? '' : undefined}
              >
                {/* Named by the block's title, which is the group's name. */}
                <fieldset
                  className={styles.cardFieldset}
                  aria-labelledby={`group-${g.slug}`}
                >
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
                                    ...selected.filter(
                                      (s) => !tiers.some((x) => x.slug === s),
                                    ),
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
                            <Prices line={line} locale={locale} />
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  {chosen && pinned(chosen.slug) && (
                    <p className={styles.note}>{copy.pinned}</p>
                  )}
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
            </ul>
          </Step>
        )
      })}
      <Step
        num={blockNum(CATEGORY_GROUPS.length + 1)}
        title={copy.blocks.otherCategories}
        titleId="group-other"
      >
        <ul className={styles.cards} aria-labelledby="group-other">
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
                      [c.blurb ? blurbId : null, why ? whyId : null]
                        .filter(Boolean)
                        .join(' ') || undefined
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
                <Prices line={quote(c)} locale={locale} />
              </li>
            )
          })}
        </ul>
        {form.categoryError && (
          <p className={styles.error} role="alert">
            {form.categoryError.message || copy.categoryError}
          </p>
        )}
      </Step>
    </fieldset>
  )
}
