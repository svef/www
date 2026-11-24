'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { getCategory } from '@/lib/awards/categories'
import { earlyBirdPrice } from '@/lib/awards/pricing'
import type { EntryView } from '@/lib/awards/projects/types'
import { authClient } from '@/lib/awards/auth/client'
import { FIELD_DEFINITIONS, PROJECT_FIELDS, type FieldDefinition } from '@/lib/awards/fields'
import { isSubmittedLike, toMs } from '@/lib/awards/types'
import { resolveAnswers } from '@/lib/awards/visibility'
import type { Locale } from '@/lib/i18n'
import { getProjectFormCopy } from './copy'
import { goToField } from './focus'
import { formatMoney, lastDayBefore } from './format'
import styles from './Submit.module.scss'
import { SUBMIT_STEP_FIELDS } from './sections'
import { missingItems, type MissingItem, type PriceBreakdown } from './summary'
import type { ProjectFormApi } from './useProjectForm'

/**
 * The end of the review: the terms, what blocks submitting (or the early-bird note and
 * the button), the confirmation dialog, the per-entry status and the success summary.
 * State and the server calls live in the form controller; this is presentation.
 */

type Target = { entryId?: string; categories: string[] }

export function SubmitPanel({
  form,
  locale,
  missing,
  prices,
}: {
  form: ProjectFormApi
  locale: Locale
  missing: MissingItem[]
  prices: PriceBreakdown
}) {
  const copy = getProjectFormCopy(locale)
  const { view, submitOutcome, submitting } = form
  const money = (n: number) => formatMoney(n, locale, copy.currency)
  const termsId = useId()
  const blockersId = useId()
  const [checked, setChecked] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [pressedBlocked, setPressedBlocked] = useState(false)
  const [withdrawing, setWithdrawing] = useState<EntryView | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeRef = useRef<HTMLParagraphElement>(null)
  // The message takes focus once the dialog has closed and handed focus back.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => noticeRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [notice])
  const summaryRef = useRef<HTMLDivElement>(null)
  const blockersRef = useRef<HTMLDivElement>(null)

  const nameOf = (slug: string) => getCategory(slug)?.name[locale] ?? slug
  const drafts = view.entries.filter((e) => e.status === 'draft')
  const live = view.entries.filter((e) => e.status !== 'withdrawn')
  const withdrawn = view.entries.filter((e) => e.status === 'withdrawn')
  const isCreator = view.role === 'creator'
  const hasSubmitted = live.some((e) => isSubmittedLike(e.status))
  const termsOk = view.terms.accepted || checked

  const now = toMs(view.serverNow)
  const opened = now >= toMs(view.intakeOpensAt)
  const closed = now >= toMs(view.intakeClosesBefore)
  const dateLong = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'is' ? 'is-IS' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(iso))

  // With nothing but withdrawn entries left, what stops a re-submit is judged with their
  // categories counted in (the review's list only counts live entries).
  const effectiveMissing = useMemo(
    () =>
      drafts.length > 0 || withdrawn.length === 0
        ? missing
        : missingItems(
            [...new Set([...form.categories, ...withdrawn.map((e) => e.category)])],
            form.answers,
            form.billingProfileId,
          ),
    [drafts.length, withdrawn, missing, form.categories, form.answers, form.billingProfileId],
  )

  const verified = view.viewer.emailVerified
  const blockers: { key: string; node: React.ReactNode }[] = []
  if (!opened)
    blockers.push({ key: 'not-open', node: copy.submitBlockNotOpen(dateLong(view.intakeOpensAt)) })
  if (closed) blockers.push({ key: 'closed', node: copy.submitBlockClosed })
  if (form.readOnly) blockers.push({ key: 'lock', node: copy.submitBlockLock })
  for (const m of effectiveMissing)
    blockers.push({
      key: m.key,
      node: (
        <a
          href={m.fieldKey ? `#field-${m.fieldKey}` : `#section-${m.section}`}
          data-blocker-key={m.key}
          onClick={(e) => {
            e.preventDefault()
            if (m.fieldKey) form.markTouched(m.fieldKey)
            goToField(m)
          }}
        >
          {m.message[locale]}
        </a>
      ),
    })
  if (!termsOk)
    blockers.push({
      key: 'terms',
      node: (
        <a
          href={`#${termsId}`}
          data-blocker-key="terms"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(termsId)?.focus()
          }}
        >
          {copy.submitBlockTerms}
        </a>
      ),
    })
  if (!verified) blockers.push({ key: 'verify', node: copy.verifyTitle })
  if (drafts.length === 0 && !closed && hasSubmitted)
    blockers.push({ key: 'nothing', node: copy.submitBlockNothing })

  const unverified = !verified
  const blocked = blockers.length > 0 || unverified || submitting
  // Submitting a withdrawn entry again is not stopped by "nothing left to submit".
  const resubmitBlocked =
    blockers.some((b) => b.key !== 'nothing') || unverified || submitting

  // Fields still editable after submitting, and those that lock (visible ones only).
  const { editable, locked } = useMemo(() => {
    const resolved = resolveAnswers(PROJECT_FIELDS, form.categories, form.answers)
    const shown: FieldDefinition[] = [
      ...resolved.visible.filter((f) => !SUBMIT_STEP_FIELDS.has(f.key)),
      ...FIELD_DEFINITIONS.filter((f) => f.scope === 'entry'),
    ]
    const label = (f: FieldDefinition) => f.label[locale]
    return {
      editable: shown.filter((f) => f.editableAfterSubmit).map(label),
      locked: shown.filter((f) => !f.editableAfterSubmit).map(label),
    }
  }, [form.categories, form.answers, locale])

  function open(next: Target) {
    const stopped = next.entryId && withdrawn.some((e) => e.id === next.entryId) ? resubmitBlocked : blocked
    if (stopped) {
      setPressedBlocked(true)
      blockersRef.current?.focus()
      return
    }
    setTarget(next)
  }

  // After a successful submit the dialog closes and the summary takes focus.
  async function confirm(t: Target) {
    const ok = await form.submit({
      entryId: t.entryId,
      acceptTerms: checked || view.terms.accepted,
    })
    if (!ok) return
    setTarget(null)
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const entryTargets = (t: Target) =>
    t.entryId ? [...drafts, ...withdrawn].filter((e) => e.id === t.entryId) : drafts
  const result = submitOutcome && 'result' in submitOutcome ? submitOutcome.result : null

  return (
    <div className={styles.panel} data-submit-panel data-slot="submit">
      {result && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          className={styles.done}
          role="status"
          data-submit-done
        >
          {result.submitted.length > 0 ? (
            <>
              <h3>{copy.doneTitle(result.submitted.length)}</h3>
              <ul>
                {result.submitted.map((s) => (
                  <li key={s.entryId}>
                    {nameOf(s.category)}:{' '}
                    {copy.entryLockedPrice(
                      money(s.price.amount),
                      s.early ? copy.tierEarly : copy.tierRegular,
                    )}
                  </li>
                ))}
              </ul>
              <p>{copy.doneLocked}</p>
              <p>
                {result.receipt === 'failed'
                  ? copy.doneReceiptFailed
                  : copy.doneReceipt(view.viewer.email)}
              </p>
            </>
          ) : (
            result.skipped.length === 0 && <p>{copy.doneAlready}</p>
          )}
          {result.skipped.length > 0 && (
            <>
              <h3>{copy.doneSkipped}</h3>
              <ul data-submit-skipped>
                {result.skipped.map((s) => (
                  <li key={s.entryId}>
                    {nameOf(s.category)}: {copy.skipReason[s.reason]}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <p
        ref={noticeRef}
        tabIndex={-1}
        role="status"
        className={notice ? styles.done : styles.srOnly}
        data-withdraw-done
      >
        {notice}
      </p>

      {live.length > 0 && hasSubmitted && (
        <div className={styles.block}>
          <h3 className={styles.title}>{copy.entriesTitle}</h3>
          <ul className={styles.entries} data-entries>
            {live.map((e) => (
              <li key={e.id} data-entry-row={e.category} data-status={e.status}>
                <span className={styles.entryName}>{nameOf(e.category)}</span>
                <span className={styles.status}>{copy.status[e.status] ?? e.status}</span>
                {e.price && (
                  <span className={styles.entryPrice}>
                    {copy.entryLockedPrice(
                      money(e.price.amount),
                      e.price.discountPercent > 0 ? copy.tierEarly : copy.tierRegular,
                    )}
                  </span>
                )}
                {e.status === 'submitted' && isCreator && (
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-disabled={closed || form.readOnly || submitting}
                    data-withdraw-entry={e.category}
                    onClick={() => {
                      if (closed || form.readOnly || submitting) return
                      setNotice(null)
                      setWithdrawing(e)
                    }}
                  >
                    {copy.withdrawButton(nameOf(e.category))}
                  </button>
                )}
                {e.status === 'draft' && (
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-disabled={blocked}
                    data-submit-entry={e.category}
                    onClick={() => open({ entryId: e.id, categories: [e.category] })}
                  >
                    {copy.submitThis(nameOf(e.category))}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.muted}>{copy.submittedNote}</p>
        </div>
      )}

      {withdrawn.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.title}>{copy.withdrawnTitle}</h3>
          <ul className={styles.entries} data-withdrawn-entries>
            {withdrawn.map((e) => {
              const regular = getCategory(e.category)?.price ?? 0
              const early = prices.earlyAvailable
              const price = early
                ? earlyBirdPrice(regular, view.earlyBird.discountPercent, view.earlyBird.rounding)
                : regular
              return (
                <li key={e.id} data-entry-row={e.category} data-status="withdrawn">
                  <span className={styles.entryName}>{nameOf(e.category)}</span>
                  <span className={styles.status}>{copy.status.withdrawn}</span>
                  <span className={styles.entryPrice}>
                    {copy.withdrawnNow(money(price), early ? copy.tierEarly : copy.tierRegular)}
                  </span>
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-disabled={resubmitBlocked || closed}
                    data-resubmit-entry={e.category}
                    onClick={() => open({ entryId: e.id, categories: [e.category] })}
                  >
                    {copy.resubmit(nameOf(e.category))}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className={styles.muted}>{copy.resubmitNote}</p>
        </div>
      )}

      {(drafts.length > 0 || (withdrawn.length > 0 && !closed)) && (
        <>
          {(drafts.length > 0 || !view.terms.accepted) && (
          <div className={styles.block}>
            <h3 className={styles.title} id={`${termsId}-title`}>
              {copy.termsTitle}
            </h3>
            <div
              className={styles.terms}
              role="region"
              aria-labelledby={`${termsId}-title`}
              tabIndex={0}
              data-terms
            >
              <p className={styles.draftTag}>
                {copy.termsVersion(view.terms.version)} · {copy.termsDraftNote}
              </p>
              {copy.termsBody.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {view.terms.accepted ? (
              <p className={styles.ok} data-terms-accepted>
                {copy.termsAcceptedAlready(view.terms.version)}
              </p>
            ) : (
              <label className={styles.check}>
                <input
                  id={termsId}
                  type="checkbox"
                  checked={checked}
                  disabled={form.readOnly}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <span>{copy.termsAccept(view.terms.version)}</span>
              </label>
            )}
          </div>
          )}

          {unverified && (
            <VerifyNotice email={view.viewer.email} locale={locale} />
          )}

          {blockers.length > 0 && (
            <div
              ref={blockersRef}
              tabIndex={-1}
              id={blockersId}
              className={styles.blockers}
              data-submit-blockers
              data-pressed={pressedBlocked || undefined}
            >
              <h3 className={styles.title}>{copy.submitBlockers}</h3>
              <ul>
                {blockers.map((b) => (
                  <li key={b.key}>{b.node}</li>
                ))}
              </ul>
            </div>
          )}

          {drafts.length > 0 && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              aria-disabled={blocked}
              aria-describedby={blockers.length ? blockersId : undefined}
              data-submit
              onClick={() => open({ categories: drafts.map((e) => e.category) })}
            >
              {submitting ? copy.submitWorking : copy.submitButton}
            </button>
            <p className={styles.hint} data-early-explain>
              {prices.earlyAvailable
                ? copy.submitEarlyExplain(
                    lastDayBefore(view.earlyBird.endsBefore, locale),
                    money(prices.totalEarly),
                    money(prices.totalRegular),
                  )
                : copy.submitEarlyOver}
            </p>
          </div>
          )}
        </>
      )}

      {withdrawing && (
        <WithdrawDialog
          locale={locale}
          entry={withdrawing}
          earlyBird={view.earlyBird}
          earlyOpen={prices.earlyAvailable}
          onClose={() => setWithdrawing(null)}
          onConfirm={async () => {
            const r = await form.withdraw(withdrawing.id)
            if (!r.ok) return copy.withdrawErrors[r.error.code] ?? copy.withdrawErrors.unexpected
            setWithdrawing(null)
            setNotice(copy.withdrawDone(nameOf(withdrawing.category)))
            return null
          }}
        />
      )}

      {target && (
        <ConfirmDialog
          locale={locale}
          onClose={() => setTarget(null)}
          onConfirm={() => void confirm(target)}
          submitting={submitting}
          error={
            submitOutcome && 'error' in submitOutcome
              ? (copy.submitErrors[submitOutcome.error.code] ?? copy.submitErrors.unexpected)
              : null
          }
          lines={entryTargets(target).map((e) => {
            const line = prices.lines.find((l) => l.slug === e.category)
            const early = prices.earlyAvailable
            // A withdrawn entry is not in the running totals; price it from the catalogue.
            const regular = getCategory(e.category)?.price ?? 0
            const amount = line
              ? early
                ? line.early
                : line.regular
              : early
                ? earlyBirdPrice(regular, view.earlyBird.discountPercent, view.earlyBird.rounding)
                : regular
            return {
              slug: e.category,
              amount,
              tier: early ? copy.tierEarly : copy.tierRegular,
            }
          })}
          earlyOpen={prices.earlyAvailable}
          lastDay={lastDayBefore(view.earlyBird.endsBefore, locale)}
          editable={editable}
          locked={locked}
        />
      )}
    </div>
  )
}

function VerifyNotice({ email, locale }: { email: string; locale: Locale }) {
  const copy = getProjectFormCopy(locale)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  async function resend() {
    if (state === 'sending') return
    setState('sending')
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.pathname,
      })
      setState(error ? 'failed' : 'sent')
    } catch {
      setState('failed')
    }
  }
  return (
    <div className={styles.verify} data-verify-notice>
      <h3 className={styles.title}>{copy.verifyTitle}</h3>
      <p>{copy.verifyBody(email)}</p>
      <button type="button" className={styles.secondary} onClick={resend} aria-disabled={state === 'sending'}>
        {copy.verifyResend}
      </button>
      <p role="status" className={styles.muted}>
        {state === 'sending' && copy.verifySending}
        {state === 'sent' && copy.verifySent}
        {state === 'failed' && copy.verifyFailed}
      </p>
    </div>
  )
}

/** Tab wraps inside the dialog instead of leaving it for the browser's own controls. */
function trapTab(e: React.KeyboardEvent<HTMLDialogElement>) {
  if (e.key !== 'Tab') return
  const items = [
    ...e.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

function ConfirmDialog({
  locale,
  lines,
  earlyOpen,
  lastDay,
  editable,
  locked,
  submitting,
  error,
  onClose,
  onConfirm,
}: {
  locale: Locale
  lines: { slug: string; amount: number; tier: string }[]
  earlyOpen: boolean
  lastDay: string
  editable: string[]
  locked: string[]
  submitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  const copy = getProjectFormCopy(locale)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const money = (n: number) => formatMoney(n, locale, copy.currency)
  const total = lines.reduce((n, l) => n + l.amount, 0)

  // A native modal dialog: focus moves in and is trapped, the page behind is inert, Escape
  // closes it, and focus returns to the button that opened it.
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (submitting) e.preventDefault()
      }}
      onKeyDown={trapTab}
      data-confirm-dialog
    >
      <div className={styles.dialogBody}>
        <h2 id={titleId} className={styles.dialogTitle}>
          {copy.dialogTitle}
        </h2>
        <p>{copy.dialogIntro(lines.length)}</p>

        <h3 className={styles.title}>{copy.dialogPrices}</h3>
        <ul className={styles.priceList} data-dialog-prices>
          {lines.map((l) => (
            <li key={l.slug} data-dialog-price={l.slug}>
              <span>{getCategory(l.slug)?.name[locale] ?? l.slug}</span>
              <span>
                {money(l.amount)} <span className={styles.muted}>({l.tier})</span>
              </span>
            </li>
          ))}
          <li className={styles.totalRow}>
            <span>{copy.dialogTotal}</span>
            <span data-dialog-total>{money(total)}</span>
          </li>
        </ul>

        <h3 className={styles.title}>{copy.dialogEditable}</h3>
        <ul className={styles.plain} data-dialog-editable>
          {editable.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <h3 className={styles.title}>{copy.dialogLocked}</h3>
        <ul className={styles.plain} data-dialog-locked>
          {locked.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className={styles.warn} data-dialog-withdraw>
          {earlyOpen ? copy.dialogWithdrawEarly(lastDay) : copy.dialogWithdrawRegular}
        </p>

        {error && (
          <p role="alert" className={styles.error} data-dialog-error>
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose} disabled={submitting}>
            {copy.dialogCancel}
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={onConfirm}
            aria-disabled={submitting}
            data-confirm-submit
          >
            {submitting ? copy.submitWorking : copy.dialogConfirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}

function WithdrawDialog({
  locale,
  entry,
  earlyBird,
  earlyOpen,
  onClose,
  onConfirm,
}: {
  locale: Locale
  entry: EntryView
  earlyBird: { endsBefore: string }
  earlyOpen: boolean
  onClose: () => void
  /** Resolves to an error message, or null when it worked (the caller closes the dialog). */
  onConfirm: () => Promise<string | null>
}) {
  const copy = getProjectFormCopy(locale)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const money = (n: number) => formatMoney(n, locale, copy.currency)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  // The cost is read from the entry's own locked price: what it would cost at the regular price
  // is what a late re-submit pays, so that is the number the dialog states.
  const hadEarly = (entry.price?.discountPercent ?? 0) > 0
  const regular = money(entry.price?.regular ?? getCategory(entry.category)?.price ?? 0)
  const cost = hadEarly
    ? earlyOpen
      ? copy.withdrawEarlyBeforeEnd(lastDayBefore(earlyBird.endsBefore, locale), regular)
      : copy.withdrawEarlyAfterEnd(regular)
    : copy.withdrawRegular(regular)
  const name = getCategory(entry.category)?.name[locale] ?? entry.category

  async function go() {
    if (working) return
    setWorking(true)
    setError(null)
    const message = await onConfirm()
    // On success the dialog is unmounted by the caller.
    setWorking(false)
    if (message) setError(message)
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (working) e.preventDefault()
      }}
      onKeyDown={trapTab}
      data-withdraw-dialog
    >
      <div className={styles.dialogBody}>
        <h2 id={titleId} className={styles.dialogTitle}>
          {copy.withdrawTitle}
        </h2>
        <p>{copy.withdrawIntro(name)}</p>
        <p className={styles.warn} data-withdraw-cost>
          {cost}
        </p>
        {error && (
          <p role="alert" className={styles.error} data-withdraw-error>
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose} disabled={working}>
            {copy.dialogCancel}
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void go()}
            aria-disabled={working}
            data-confirm-withdraw
          >
            {working ? copy.withdrawWorking : copy.withdrawConfirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}
