'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { inputClass } from '@/components/FormParts/FormParts'
import { GrowText } from '@/components/GrowText/GrowText'
import { getCategory } from '@/lib/awards/categories'
import type { BulkPlan, Skipped } from '@/lib/awards/bulk/plan'
import type { BulkResult } from '@/lib/awards/bulk/service'
import { localePath, type Locale } from '@/lib/i18n'
import { planBulkAction, runBulkAction, type BulkInput } from '@/app/(app)/[locale]/innsendingar/minar/actions'
import { formatMoney } from './copy'
import { bulkCopy, type BulkCopy } from './bulk-copy'
import styles from './Dashboard.module.scss'

/**
 * The confirmation and result for a bulk action: a modal that asks the server what
 * would happen, shows it (what will be done, with the totals, and what is skipped and why,
 * each with a link), runs it on confirmation, and then reports done / skipped in a live
 * region. The server decides everything; this is presentation and the two calls.
 */
export type BulkRequest = { kind: BulkInput['kind']; entryIds: string[] }

export type BillingChoice = { id: string; companyName: string; kennitala: string }

type Phase =
  | { kind: 'planning' }
  | { kind: 'ready'; plan: BulkPlan }
  | { kind: 'running'; plan: BulkPlan }
  | { kind: 'done'; result: BulkResult }
  | { kind: 'error'; message: string }

/** Where in the project the person fixes the problem. */
const hashFor = (reason: Skipped['reason']) =>
  reason === 'no_billing'
    ? '#section-billing'
    : reason === 'terms_not_accepted' || reason === 'project_incomplete' || reason === 'entry_incomplete'
      ? '#section-review'
      : ''

export function BulkDialog({
  locale,
  request,
  billingProfiles,
  lastEarlyDay,
  earlyOpen,
  onClose,
  onChanged,
}: {
  locale: Locale
  request: BulkRequest
  billingProfiles: BillingChoice[]
  /** "4 January 2027": the last day the early-bird price is available. */
  lastEarlyDay: string
  earlyOpen: boolean
  /** The dialog was dismissed. */
  onClose: () => void
  /** Something was changed on the server: refresh the dashboard. */
  onChanged: () => void
}) {
  const c = bulkCopy[locale]
  const ref = useRef<HTMLDialogElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const profileId = useId()
  const [phase, setPhase] = useState<Phase>({ kind: 'planning' })
  const [profile, setProfile] = useState('')
  const money = (n: number) => formatMoney(n, locale)
  const name = (slug: string) => getCategory(slug)?.name[locale] ?? slug
  const isBilling = request.kind === 'billing'

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  // Plan on open (and, for billing, whenever the chosen profile changes).
  useEffect(() => {
    if (isBilling && !profile) return
    let stale = false
    void planBulkAction({ ...request, billingProfileId: isBilling ? profile : undefined }).then(
      (r) => {
        if (stale) return
        setPhase(r.ok ? { kind: 'ready', plan: r.value } : { kind: 'error', message: c.planFailed })
      },
      () => !stale && setPhase({ kind: 'error', message: c.planFailed }),
    )
    return () => {
      stale = true
    }
    // The request is fixed for the life of the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // The result takes focus when it appears, so a screen reader reads it out.
  const finished = phase.kind === 'done'
  useEffect(() => {
    if (finished) resultRef.current?.focus()
  }, [finished])

  const busy = phase.kind === 'running'
  async function confirm() {
    if (phase.kind !== 'ready' || phase.plan.items.length === 0) return
    setPhase({ kind: 'running', plan: phase.plan })
    const r = await runBulkAction({ ...request, billingProfileId: isBilling ? profile : undefined }).catch(
      () => null,
    )
    if (r?.ok) {
      setPhase({ kind: 'done', result: r.value })
      onChanged()
    } else {
      setPhase({ kind: 'error', message: c.runFailed })
      onChanged()
    }
  }

  const plan = phase.kind === 'ready' || phase.kind === 'running' ? phase.plan : null
  const count = plan ? plan.items.length : 0

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      onKeyDown={trapTab}
      data-bulk-dialog={request.kind}
    >
      <div className={styles.dialogBody}>
        <h2 id={titleId} className={styles.dialogTitle}>
          {c.title[request.kind]}
        </h2>

        {isBilling && phase.kind !== 'done' && (
          <div className={styles.dialogField}>
            <label htmlFor={profileId}>{c.billingLabel}</label>
            {billingProfiles.length === 0 ? (
              <p>{c.billingNone}</p>
            ) : (
              <select
                id={profileId}
                className={inputClass}
                value={profile}
                disabled={busy}
                onChange={(e) => {
                  setProfile(e.target.value)
                  setPhase({ kind: 'planning' })
                }}
                data-bulk-profile
              >
                <option value="">{c.billingChoose}</option>
                {billingProfiles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.companyName} ({b.kennitala})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {phase.kind === 'planning' && !(isBilling && !profile) && <p role="status">{c.planning}</p>}
        {phase.kind === 'error' && (
          <p role="alert" className={styles.dialogError} data-bulk-error>
            {phase.message}
          </p>
        )}

        {plan && (
          <>
            {plan.kind === 'submit' && count > 0 && (
              <>
                <p>{c.submitIntro(count)}</p>
                <h3 className={styles.dialogHeading}>{c.willHeading.submit}</h3>
                <ul className={styles.planList} data-bulk-items>
                  {plan.items.map((i) => (
                    <li key={i.entryId} data-bulk-item={i.entryId}>
                      <span>
                        {i.projectTitle || c.untitled}: {name(i.category)}
                        {i.resubmit && <span className={styles.muted}> ({c.resubmitTag})</span>}
                      </span>
                      <span className={styles.planAmount}>
                        {money(i.amount)}{' '}
                        <span className={styles.muted}>({i.early ? c.tierEarly : c.tierRegular})</span>
                      </span>
                    </li>
                  ))}
                  <li className={styles.totalRow}>
                    <span>{c.total}</span>
                    <span className={styles.planAmount} data-bulk-total={plan.total}>
                      {money(plan.total)}
                    </span>
                  </li>
                </ul>
              </>
            )}
            {plan.kind === 'withdraw' && count > 0 && (
              <>
                <p>{c.withdrawIntro(count)}</p>
                <h3 className={styles.dialogHeading}>{c.willHeading.withdraw}</h3>
                <ul className={styles.planList} data-bulk-items>
                  {plan.items.map((i) => (
                    <li key={i.entryId} data-bulk-item={i.entryId}>
                      <span>
                        {i.projectTitle || c.untitled}: {name(i.category)}
                      </span>
                      <span className={styles.costNote} data-bulk-cost>
                        {i.hadEarlyBird
                          ? earlyOpen
                            ? c.withdrawEarlyBeforeEnd(lastEarlyDay, money(i.regular))
                            : c.withdrawEarlyAfterEnd(money(i.regular))
                          : c.withdrawRegular(money(i.regular))}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {plan.kind === 'billing' && count > 0 && (
              <>
                <p>{c.billingIntro(count)}</p>
                <h3 className={styles.dialogHeading}>{c.willHeading.billing}</h3>
                <ul className={styles.planList} data-bulk-items>
                  {plan.items.map((i) => (
                    <li key={i.projectId} data-bulk-item={i.projectId}>
                      <span>{i.projectTitle || c.untitled}</span>
                      <span className={styles.muted}>
                        {c.billingTo(billingProfiles.find((b) => b.id === profile)?.companyName ?? '')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {count === 0 && <p data-bulk-nothing>{c.nothing}</p>}
            <SkippedList c={c} locale={locale} skipped={plan.skipped} name={name} />
          </>
        )}

        {phase.kind === 'done' && (
          <div ref={resultRef} tabIndex={-1} role="status" className={styles.result} data-bulk-result>
            <h3 className={styles.dialogHeading}>{c.resultHeading}</h3>
            <p data-bulk-done-count={phase.result.done.length}>
              {phase.result.done.length > 0
                ? c.doneHeading[phase.result.kind](phase.result.done.length)
                : c.noneDone}
            </p>
            {phase.result.kind === 'submit' && phase.result.done.length > 0 && (
              <>
                <p>
                  {c.total}: {money(phase.result.total)}
                </p>
                <p>{c.receipts(phase.result.receipts.sent, phase.result.receipts.failed)}</p>
              </>
            )}
            <SkippedList c={c} locale={locale} skipped={phase.result.skipped} name={name} />
          </div>
        )}

        <div className={styles.dialogActions}>
          {phase.kind === 'done' ? (
            <button
              type="button"
              className={clsx('btn-grow', styles.primaryButton)}
              onClick={() => ref.current?.close()}
            >
              <GrowText>{c.close}</GrowText>
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => ref.current?.close()}
                disabled={busy}
              >
                {phase.kind === 'error' ? c.close : c.cancel}
              </button>
              {phase.kind !== 'error' && (
                <button
                  type="button"
                  className={clsx(
                    'btn-grow',
                    request.kind === 'withdraw' ? styles.destructiveButton : styles.primaryButton,
                  )}
                  onClick={() => void confirm()}
                  aria-disabled={busy || phase.kind !== 'ready' || count === 0}
                  data-bulk-confirm
                >
                  <GrowText>{busy ? c.working : c.confirm[request.kind](count)}</GrowText>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}

function SkippedList({
  c,
  locale,
  skipped,
  name,
}: {
  c: BulkCopy
  locale: Locale
  skipped: Skipped[]
  name: (slug: string) => string
}) {
  if (skipped.length === 0) return null
  return (
    <>
      <h3 className={styles.dialogHeading}>{c.skippedHeading(skipped.length)}</h3>
      <ul className={styles.planList} data-bulk-skipped>
        {skipped.map((s) => (
          <li key={`${s.projectId}-${s.entryId ?? 'project'}`} data-bulk-skip={s.reason}>
            <span>
              {s.projectTitle || c.untitled}
              {s.category ? `: ${name(s.category)}` : ''}
              {' – '}
              {s.reason === 'locked' && s.detail ? c.lockedBy(s.detail) : c.reasons[s.reason]}
            </span>
            <Link href={`${localePath(`/innsendingar/${s.projectId}`, locale)}${hashFor(s.reason)}`}>
              {c.openProject}
              <span className={styles.srOnly}> – {s.projectTitle || c.untitled}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Tab wraps inside the dialog instead of leaving it for the browser's own controls. */
function trapTab(e: React.KeyboardEvent<HTMLDialogElement>) {
  if (e.key !== 'Tab') return
  const items = [
    ...e.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ]
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === e.currentTarget)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}
