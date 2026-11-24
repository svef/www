'use client'

import { useMemo } from 'react'
import { Step } from '@/components/FormParts/FormParts'
import { getCategory } from '@/lib/awards/categories'
import { formatKennitala } from '@/lib/awards/billing/rules'
import { PROJECT_FIELDS, type FieldDefinition } from '@/lib/awards/fields'
import { resolveAnswers } from '@/lib/awards/visibility'
import type { Locale } from '@/lib/i18n'
import { getProjectFormCopy, type ProjectFormCopy, type SectionId } from './copy'
import { formatMoney, lastDayBefore } from './format'
import { goToField } from './focus'
import styles from './Review.module.scss'
import { sectionOfField, SUBMIT_STEP_FIELDS } from './sections'
import { SubmitPanel } from './SubmitPanel'
import { missingItems, priceBreakdown } from './summary'
import type { ProjectFormApi } from './useProjectForm'

type Row = Record<string, unknown>

/** The steps whose answers the summary repeats, each with a link back to it. */
const ANSWER_STEPS: readonly SectionId[] = [
  'categories',
  'project',
  'questions',
  'people',
]
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** The answer as readable text (or a list of lines), never the login details themselves. */
function show(field: FieldDefinition, value: unknown, copy: ProjectFormCopy): string[] {
  switch (field.type) {
    case 'boolean':
      return [value === true ? copy.yes : copy.no]
    case 'url_list':
      return Array.isArray(value) ? value.map(str).filter(Boolean) : []
    case 'date_range': {
      const r = (value ?? {}) as { start?: string; end?: string }
      return r.start && r.end ? [`${r.start} – ${r.end}`] : []
    }
    case 'person_list':
      return Array.isArray(value)
        ? (value as Row[])
            .map((p) =>
              [p.name, p.role ?? p.company, p.email].map(str).filter(Boolean).join(', '),
            )
            .filter(Boolean)
        : []
    case 'access_credentials':
      return Array.isArray(value) && value.length
        ? [copy.reviewLoginSaved(value.length)]
        : []
    default:
      return str(value) ? [str(value)] : []
  }
}

/**
 * The last section: a summary of the answers, the price per category, and what is still
 * missing, each item linking to its field; then the submit step (`SubmitPanel`): terms,
 * the "Senda inn" button, the confirmation dialog and what happened after.
 */
export function ReviewSection({
  form,
  locale,
}: {
  form: ProjectFormApi
  locale: Locale
}) {
  const copy = getProjectFormCopy(locale)
  const { view } = form
  const money = (n: number) => formatMoney(n, locale, copy.currency)
  const categories = form.categories

  const resolved = useMemo(
    () => resolveAnswers(PROJECT_FIELDS, categories, form.answers),
    [categories, form.answers],
  )
  const missing = useMemo(
    () => missingItems(categories, form.answers, form.billingProfileId),
    [categories, form.answers, form.billingProfileId],
  )
  const prices = useMemo(
    () => priceBreakdown(categories, view.entries, view.earlyBird, view.serverNow),
    [categories, view.entries, view.earlyBird, view.serverNow],
  )
  const until = lastDayBefore(view.earlyBird.endsBefore, locale)
  const rows = resolved.visible.filter(
    (f) => !SUBMIT_STEP_FIELDS.has(f.key) && f.type !== 'image',
  )
  const nameOf = (slug: string) => getCategory(slug)?.name[locale] ?? slug

  return (
    <div className={styles.review} data-review>
      <Step num="01" title={copy.blocks.missing}>
        <div className={styles.block}>
          {missing.length === 0 ? (
            <p className={styles.ok} data-missing-none>
              {copy.reviewNothingMissing}
            </p>
          ) : (
            <ul className={styles.missing} data-missing>
              {missing.map((m) => (
                <li key={m.key}>
                  <a
                    href={m.fieldKey ? `#field-${m.fieldKey}` : `#section-${m.section}`}
                    data-missing-key={m.key}
                    onClick={(e) => {
                      e.preventDefault()
                      if (m.fieldKey) form.markTouched(m.fieldKey)
                      goToField(m)
                    }}
                  >
                    {m.message[locale]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Step>

      <Step num="02" title={copy.blocks.price}>
        <div className={styles.block}>
          {prices.lines.length === 0 ? (
            <p className={styles.muted}>{copy.totalEmpty}</p>
          ) : (
            <>
              <table className={styles.prices}>
                <thead>
                  <tr>
                    <th scope="col">{copy.reviewCategory}</th>
                    <th scope="col" className={styles.num}>
                      {copy.earlyBird}
                    </th>
                    <th scope="col" className={styles.num}>
                      {copy.regular}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prices.lines.map((l) => (
                    <tr key={l.slug} data-price={l.slug}>
                      <th scope="row">{nameOf(l.slug)}</th>
                      {l.locked !== null ? (
                        <td colSpan={2} className={styles.num}>
                          {money(l.locked)} ({copy.priceLocked})
                        </td>
                      ) : (
                        <>
                          <td className={styles.num}>{money(l.early)}</td>
                          <td className={styles.num}>{money(l.regular)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{copy.reviewTotal}</th>
                    <td className={styles.num} data-review-total-early>
                      {money(prices.totalEarly)}
                    </td>
                    <td className={styles.num} data-review-total-regular>
                      {money(prices.totalRegular)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {/* Once every entry has its price locked there is nothing left to hint at. */}
              {prices.lines.some((l) => l.locked === null) && (
                <p className={styles.muted}>
                  {prices.earlyAvailable
                    ? copy.reviewEarlyHint(
                        until,
                        money(prices.totalEarly),
                        money(prices.totalRegular),
                      )
                    : copy.totalEarlyClosed}
                </p>
              )}
            </>
          )}
          {view.billing && (
            <p className={styles.muted}>
              {copy.reviewBillingTo(
                view.billing.companyName,
                formatKennitala(view.billing.kennitala),
              )}
            </p>
          )}
        </div>
      </Step>

      <Step num="03" title={copy.blocks.answers}>
        <div className={styles.block}>
          {categories.length === 0 ? (
            <p className={styles.muted}>{copy.chooseCategories}</p>
          ) : (
            <div className={styles.groups}>
              {ANSWER_STEPS.map((step) => {
                const fields = rows.filter((f) => sectionOfField(f.key) === step)
                if (step !== 'categories' && fields.length === 0) return null
                const title = copy.sections[step].title
                return (
                  <section
                    key={step}
                    className={styles.group}
                    aria-labelledby={`review-${step}`}
                    data-review-step={step}
                  >
                    <div className={styles.groupHead}>
                      <h4 id={`review-${step}`} className={styles.groupTitle}>
                        {title}
                      </h4>
                      {/* A plain link: the form follows the hash to the step. */}
                      <a
                        className={styles.change}
                        href={`#section-${step}`}
                        aria-label={`${copy.reviewChange}: ${title}`}
                      >
                        {copy.reviewChange}
                      </a>
                    </div>
                    {step === 'categories' ? (
                      <ul className={styles.categoryList}>
                        {categories.map((c) => (
                          <li key={c}>{nameOf(c)}</li>
                        ))}
                      </ul>
                    ) : (
                      <dl className={styles.answers}>
                        {fields.map((f) => {
                          const lines = show(f, resolved.answers[f.key], copy)
                          return (
                            <div key={f.key} data-answer={f.key}>
                              <dt>{f.label[locale]}</dt>
                              <dd>
                                {lines.length ? (
                                  lines.length === 1 ? (
                                    <span className={styles.value}>{lines[0]}</span>
                                  ) : (
                                    <ul>
                                      {lines.map((l, i) => (
                                        <li key={i}>{l}</li>
                                      ))}
                                    </ul>
                                  )
                                ) : (
                                  <span className={styles.muted}>
                                    {copy.reviewNotAnswered}
                                  </span>
                                )}
                              </dd>
                            </div>
                          )
                        })}
                      </dl>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </Step>

      <SubmitPanel
        form={form}
        locale={locale}
        missing={missing}
        prices={prices}
        firstBlock={4}
      />
    </div>
  )
}
