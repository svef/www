'use client'

import { useId, useRef, useState } from 'react'
import { textareaClass } from '@/components/FormParts/FormParts'
import { GrowText } from '@/components/GrowText/GrowText'
import type { Locale } from '@/lib/i18n'
import { goToField } from './focus'
import { requestsCopy } from './requests-copy'
import { sectionOfField } from './sections'
import styles from './Requests.module.scss'
import { formatDate } from '@/lib/locale-format'

/** Plain data for one request, built on the server in the entrant's language. */
export type RequestBannerData = {
  id: string
  categoryName: string
  message: string
  /** Keys and labels of the fields it unlocks, in the order staff ticked them. */
  fields: { key: string; label: string }[]
  /** ISO. */
  deadlineAt: string
  status: 'open' | 'overdue' | 'resolved'
  /** ISO. */
  resolvedAt: string | null
  replies: { id: string; side: 'staff' | 'entrant'; authorName: string; message: string; createdAt: string }[]
}

export type RequestActions = {
  reply(requestId: string, message: string): Promise<{ ok: true } | { ok: false; reason: string }>
  done(
    requestId: string,
    reply: string,
  ): Promise<{ ok: true; returned?: boolean } | { ok: false; reason: string }>
}

/** Iceland is UTC all year, so the zone is stated instead of guessed from the browser. */
const when = (iso: string, locale: Locale) =>
  `${formatDate(iso, locale, { time: true })} UTC`

/**
 * One banner per unresolved request on the project page: its message and deadline,
 * the fields it unlocks (linked, and highlighted in the form), a short thread, a reply box and
 * "Mark as done". Resolved requests are kept below as a quiet history. `onChanged` runs after
 * either action so the page and the form's own view (which fields are editable) refresh.
 */
export function RequestBanners({
  requests,
  locale,
  actions,
  onChanged,
}: {
  requests: RequestBannerData[]
  locale: Locale
  actions: RequestActions
  onChanged: () => Promise<void> | void
}) {
  const c = requestsCopy[locale]
  const unresolved = requests.filter((r) => r.status !== 'resolved')
  const resolved = requests.filter((r) => r.status === 'resolved')
  // The outcome lives here, not in the banner: a banner that was just marked done is gone
  // from the list by the time the page has refreshed, and the message has to outlast it.
  const [notice, setNotice] = useState<Notice | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  if (requests.length === 0) return null
  return (
    <section id="requests" className={styles.requests} aria-label={c.title} data-testid="requests">
      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className={styles.status}
        data-kind={notice?.kind}
        data-testid="request-status"
      >
        {notice?.text}
      </p>
      {unresolved.map((r) => (
        <Banner
          key={r.id}
          request={r}
          locale={locale}
          actions={actions}
          onChanged={onChanged}
          report={(n) => {
            setNotice(n)
            // After the render that shows the message, so the screen reader reads it.
            requestAnimationFrame(() => statusRef.current?.focus())
          }}
        />
      ))}
      {resolved.length > 0 && (
        <details className={styles.history}>
          <summary>
            {c.history} ({resolved.length})
          </summary>
          <ul>
            {resolved.map((r) => (
              <li key={r.id} data-request-id={r.id} data-status="resolved">
                <strong>{r.categoryName}</strong>
                {r.resolvedAt && <> · {c.resolvedAt(when(r.resolvedAt, locale))}</>}
                <p className={styles.message}>{r.message}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

type Notice = { kind: 'ok' | 'error'; text: string }

function Banner({
  request: r,
  locale,
  actions,
  onChanged,
  report,
}: {
  request: RequestBannerData
  locale: Locale
  actions: RequestActions
  onChanged: () => Promise<void> | void
  report: (notice: Notice) => void
}) {
  const c = requestsCopy[locale]
  const id = useId()
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const overdue = r.status === 'overdue'

  async function run(kind: 'send' | 'done') {
    setBusy(true)
    try {
      const result =
        kind === 'send' ? await actions.reply(r.id, reply) : await actions.done(r.id, reply)
      if (result.ok) {
        setReply('')
        report({
          kind: 'ok',
          text:
            kind === 'send'
              ? c.sent
              : (result as { returned?: boolean }).returned === false
                ? c.doneStill
                : c.doneOk,
        })
        await onChanged()
      } else {
        report({ kind: 'error', text: c.errors[result.reason] ?? c.errors.unexpected })
      }
    } catch {
      report({ kind: 'error', text: c.errors.unexpected })
    } finally {
      setBusy(false)
    }
  }

  const jump = (key: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Switch to the field's step and move focus, not just the scroll position, so a
    // keyboard user lands in the field. `goToField` also opens the collapsed category note.
    e.preventDefault()
    goToField({ fieldKey: key, section: sectionOfField(key) ?? 'project' })
  }

  return (
    <article
      className={styles.banner}
      data-testid="request-banner"
      data-request-id={r.id}
      data-status={r.status}
      aria-labelledby={`${id}-h`}
    >
      <header className={styles.head}>
        <h2 id={`${id}-h`} className={styles.title}>
          {c.heading(r.categoryName)}
        </h2>
        <span className={styles.chip} data-status={r.status}>
          {overdue ? c.overdue : c.open}
        </span>
      </header>
      <p className={styles.deadline}>
        <strong>{c.deadline}:</strong> <time dateTime={r.deadlineAt}>{when(r.deadlineAt, locale)}</time>
      </p>
      <p className={styles.message}>{r.message}</p>
      <p className={styles.note}>{overdue ? c.overdueNote : c.dueNote}</p>

      <h3 className={styles.sub}>{c.fields}</h3>
      {r.fields.length === 0 ? (
        <p className={styles.note}>{c.noFields}</p>
      ) : (
        <ul className={styles.fields}>
          {r.fields.map((f) => (
            <li key={f.key}>
              {overdue ? (
                f.label
              ) : (
                <a href={`#field-${f.key}`} onClick={jump(f.key)} aria-label={c.goTo(f.label)}>
                  {f.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {r.replies.length > 0 && (
        <>
          <h3 className={styles.sub}>{c.thread}</h3>
          <ol className={styles.thread}>
            {r.replies.map((p) => (
              <li key={p.id} data-side={p.side}>
                <strong>{p.side === 'staff' ? c.staff : c.you}</strong>
                {p.side === 'entrant' && <span className={styles.who}> {p.authorName}</span>}
                <span className={styles.message}>{p.message}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className={styles.reply}>
        <label htmlFor={`${id}-reply`}>{c.replyLabel}</label>
        <textarea
          id={`${id}-reply`}
          className={textareaClass}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={busy}
        />
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => run('send')}
            disabled={busy || reply.trim() === ''}
          >
            {c.send}
          </button>
          {!overdue && (
            <button
              type="button"
              className={`btn-grow ${styles.primary}`}
              onClick={() => run('done')}
              disabled={busy}
            >
              <GrowText>{busy ? c.working : c.done}</GrowText>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
