'use client'

import { useMemo } from 'react'
import { getCategory } from '@/lib/awards/categories'
import { formatKennitala } from '@/lib/awards/billing/rules'
import { PROJECT_FIELDS, type FieldDefinition } from '@/lib/awards/fields'
import { resolveAnswers } from '@/lib/awards/visibility'
import type { Locale } from '@/lib/i18n'
import { getProjectFormCopy, type ProjectFormCopy } from './copy'
import { formatMoney, lastDayBefore } from './format'
import { goToField } from './focus'
import styles from './Review.module.scss'
import { sectionOfField, SUBMIT_STEP_FIELDS } from './sections'
import { missingItems, priceBreakdown } from './summary'
import type { ProjectFormApi } from './useProjectForm'

type Row = Record<string, unknown>
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
            .map((p) => [p.name, p.role ?? p.company, p.email].map(str).filter(Boolean).join(', '))
            .filter(Boolean)
        : []
    case 'access_credentials':
      return Array.isArray(value) && value.length ? [copy.reviewLoginSaved(value.length)] : []
    default:
      return str(value) ? [str(value)] : []
  }
}

/**
 * The last section: a summary of the answers, the price per category, and what is still
 * missing, each item linking to its field. **The terms checkbox, the confirmation
 * dialog and the submit button are #163 and go in the marked slot at the bottom.**
 */
export function ReviewSection({ form, locale }: { form: ProjectFormApi; locale: Locale }) {
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
  const rows = resolved.visible.filter((f) => !SUBMIT_STEP_FIELDS.has(f.key) && f.type !== 'image')
  const nameOf = (slug: string) => getCategory(slug)?.name[locale] ?? slug

  return (
    <div className={styles.review} data-review>
      <div className={styles.block}>
        <h3 className={styles.title}>{copy.reviewMissing}</h3>
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

      <div className={styles.block}>
        <h3 className={styles.title}>{copy.reviewPrices}</h3>
        {prices.lines.length === 0 ? (
          <p className={styles.muted}>{copy.totalEmpty}</p>
        ) : (
          <>
            <table className={styles.prices}>
              <thead>
                <tr>
                  <th scope="col">{copy.reviewCategory}</th>
                  <th scope="col">{copy.earlyBird}</th>
                  <th scope="col">{copy.regular}</th>
                </tr>
              </thead>
              <tbody>
                {prices.lines.map((l) => (
                  <tr key={l.slug} data-price={l.slug}>
                    <th scope="row">{nameOf(l.slug)}</th>
                    {l.locked !== null ? (
                      <td colSpan={2}>
                        {money(l.locked)} ({copy.priceLocked})
                      </td>
                    ) : (
                      <>
                        <td>{money(l.early)}</td>
                        <td>{money(l.regular)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{copy.reviewTotal}</th>
                  <td data-review-total-early>{money(prices.totalEarly)}</td>
                  <td data-review-total-regular>{money(prices.totalRegular)}</td>
                </tr>
              </tfoot>
            </table>
            <p className={styles.muted}>
              {prices.earlyAvailable
                ? copy.reviewEarlyHint(until, money(prices.totalEarly), money(prices.totalRegular))
                : copy.totalEarlyClosed}
            </p>
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

      <div className={styles.block}>
        <h3 className={styles.title}>{copy.reviewAnswers}</h3>
        {categories.length === 0 ? (
          <p className={styles.muted}>{copy.chooseCategories}</p>
        ) : (
          <dl className={styles.answers}>
            <div>
              <dt>{copy.sections.categories.title}</dt>
              <dd>
                <ul>
                  {categories.map((c) => (
                    <li key={c}>{nameOf(c)}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {rows.map((f) => {
              const lines = show(f, resolved.answers[f.key], copy)
              return (
                <div key={f.key} data-answer={f.key}>
                  <dt>
                    {f.label[locale]}{' '}
                    <a
                      className={styles.change}
                      href={`#field-${f.key}`}
                      aria-label={`${copy.reviewChange}: ${f.label[locale]}`}
                      onClick={(e) => {
                        e.preventDefault()
                        goToField({
                          fieldKey: f.key,
                          section: sectionOfField(f.key) ?? 'project',
                        })
                      }}
                    >
                      {copy.reviewChange}
                    </a>
                  </dt>
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
                      <span className={styles.muted}>{copy.reviewNotAnswered}</span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </div>

      {/*
        #163 — SUBMIT SLOT. The versioned terms checkbox, the "Senda inn" button (with the
        early-bird explanation next to it and the missing-items list on a blocked press)
        and the confirmation dialog go here. Everything above is the review; nothing
        below this line is built yet.
      */}
      <div className={styles.slot} data-slot="submit" data-issue="163">
        <p className={styles.muted}>{copy.reviewSubmitSlot}</p>
      </div>
    </div>
  )
}
