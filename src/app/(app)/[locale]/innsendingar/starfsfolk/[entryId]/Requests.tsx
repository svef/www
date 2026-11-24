import type { FieldDefinition } from '@/lib/awards/fields'
import { defaultDeadline, MAX_MESSAGE_LENGTH, MAX_REPLY_LENGTH } from '@/lib/awards/requests/rules'
import type { RequestView } from '@/lib/awards/requests/service'
import type { Locale } from '@/lib/i18n'
import { getField } from '@/lib/awards/fields'
import { requestCopy } from '../request-copy'
import styles from '../staff.module.scss'
import { openRequestAction, resolveRequestAction, staffReplyAction } from './actions'

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

const labelOf = (key: string, locale: Locale) => {
  try {
    return getField(key).label[locale]
  } catch {
    return key
  }
}

/**
 * The entry view's "Requests" section (svef/www#169): the requests on this entry with
 * their status and thread, and the form to open one. Times are the staff clock's `now`.
 */
export function Requests({
  locale,
  entryId,
  requests,
  fields,
  canOpen,
  now,
  outcome,
}: {
  locale: Locale
  entryId: string
  requests: RequestView[]
  fields: FieldDefinition[]
  canOpen: boolean
  now: Date
  /** The redirect's query string: what the last action did. */
  outcome: { request?: string; mail?: string; request_error?: string }
}) {
  const c = requestCopy[locale]
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="entryId" value={entryId} />
    </>
  )
  const errors = (outcome.request_error ?? '')
    .split(',')
    .filter(Boolean)
    .map((e) => c.errors[e] ?? c.errors.invalid)
  const done =
    outcome.request === 'opened'
      ? `${c.opened_} ${c.mail[(outcome.mail ?? 'none') as keyof typeof c.mail] ?? ''}`
      : outcome.request === 'replied'
        ? c.replied
        : outcome.request === 'resolved'
          ? c.resolved
          : null

  return (
    <>
      <p className={styles.text}>{c.lead}</p>

      {(done || errors.length > 0) && (
        <div role="status" className={styles.result} data-testid="request-result">
          {done && <p>{done}</p>}
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      {requests.length === 0 ? (
        <p className={styles.text} data-testid="requests-empty">
          {c.none}
        </p>
      ) : (
        <ul className={styles.requestList} data-testid="requests">
          {requests.map((r) => (
            <li
              key={r.id}
              className={styles.request}
              data-testid="request"
              data-request-id={r.id}
              data-status={r.status}
            >
              <h3 className={styles.subheading}>
                <span className={styles.chip} data-status={r.status}>
                  {c.status[r.status]}
                </span>{' '}
                <span>
                  {c.deadline}: <time dateTime={r.deadlineAt.toISOString()}>{stamp(r.deadlineAt)}</time>
                </span>
              </h3>
              <dl className={styles.facts}>
                <dt>{c.opened}</dt>
                <dd>
                  <time dateTime={r.createdAt.toISOString()}>{stamp(r.createdAt)}</time> {c.by}{' '}
                  {r.authorName}
                </dd>
                <dt>{c.message}</dt>
                <dd className={styles.pre}>{r.message}</dd>
                <dt>{c.fieldsUnlocked}</dt>
                <dd>
                  {r.fieldKeys.length ? r.fieldKeys.map((k) => labelOf(k, locale)).join(', ') : c.noFields}
                </dd>
                {r.resolvedAt && r.resolvedByName && (
                  <>
                    <dt>{c.status.resolved}</dt>
                    <dd>
                      {c.resolvedBy(r.resolvedByName)},{' '}
                      <time dateTime={r.resolvedAt.toISOString()}>{stamp(r.resolvedAt)}</time>
                    </dd>
                  </>
                )}
              </dl>
              {r.status === 'overdue' && <p className={styles.note}>{c.overdueNote}</p>}

              {r.replies.length > 0 && (
                <>
                  <h4 className={styles.threadHeading}>{c.thread}</h4>
                  <ol className={styles.thread}>
                    {r.replies.map((p) => (
                      <li key={p.id} data-side={p.side}>
                        <strong>
                          {p.side === 'staff' ? c.staffSide : c.entrantSide}: {p.authorName}
                        </strong>{' '}
                        <time dateTime={p.createdAt.toISOString()}>{stamp(p.createdAt)}</time>
                        <span className={styles.pre}>{p.message}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {r.status !== 'resolved' && (
                <div className={styles.requestActions}>
                  <form action={staffReplyAction} className={styles.filter}>
                    {hidden}
                    <input type="hidden" name="requestId" value={r.id} />
                    <label>
                      {c.replyLabel}
                      <textarea name="reply" rows={2} maxLength={MAX_REPLY_LENGTH} required />
                    </label>
                    <button type="submit" className={styles.small}>
                      {c.replyButton}
                    </button>
                  </form>
                  <form action={resolveRequestAction}>
                    {hidden}
                    <input type="hidden" name="requestId" value={r.id} />
                    <button type="submit" className={styles.small}>
                      {c.resolveButton}
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className={styles.subheading}>{c.formTitle}</h3>
      {canOpen ? (
        <form action={openRequestAction} className={styles.requestForm} data-testid="open-request">
          {hidden}
          <p className={styles.text}>{c.formLead}</p>
          <label className={styles.block} htmlFor="request-message">
            {c.messageLabel}
          </label>
          <p className={styles.note} id="request-message-hint">
            {c.messageHint}
          </p>
          <textarea
            id="request-message"
            name="message"
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            required
            aria-describedby="request-message-hint"
          />
          <fieldset className={styles.fieldset} aria-describedby="request-fields-hint">
            <legend>{c.fieldsLegend}</legend>
            <p className={styles.note} id="request-fields-hint">
              {c.fieldsHint}
            </p>
            <ul className={styles.checks}>
              {fields.map((f) => (
                <li key={f.key}>
                  <label>
                    <input type="checkbox" name="field" value={f.key} /> {f.label[locale]}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <label className={styles.block} htmlFor="request-deadline">
            {c.deadlineLabel}
          </label>
          <p className={styles.note} id="request-deadline-hint">
            {c.deadlineHint}
          </p>
          <input
            id="request-deadline"
            type="datetime-local"
            name="deadline"
            required
            defaultValue={defaultDeadline(now).toISOString().slice(0, 16)}
            aria-describedby="request-deadline-hint"
          />
          <p>
            <button type="submit" className={styles.button}>
              {c.submit}
            </button>
          </p>
        </form>
      ) : (
        <p className={styles.text}>{c.cannotOpen}</p>
      )}
    </>
  )
}
