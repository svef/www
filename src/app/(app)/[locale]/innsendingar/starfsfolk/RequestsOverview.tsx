import type { StaffRequestRow } from '@/lib/awards/requests/queries'
import { localePath, type Locale } from '@/lib/i18n'
import { requestCopy } from './request-copy'
import styles from './staff.module.scss'

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

export type RequestFilter = 'all' | 'open' | 'overdue'

/** The staff-wide list of unresolved requests, overdue first. */
export function RequestsOverview({
  locale,
  rows,
  overdueCount,
  filter,
  baseHref,
}: {
  locale: Locale
  rows: StaffRequestRow[]
  /** Overdue among *all* unresolved, whatever the filter. */
  overdueCount: number
  filter: RequestFilter
  /** The staff list URL without the `requests` parameter, for the filter links. */
  baseHref: (filter: RequestFilter) => string
}) {
  const c = requestCopy[locale].overview
  const s = requestCopy[locale].status
  const entryHref = (id: string) =>
    localePath(`/innsendingar/starfsfolk/${id}`, locale) + '#requests'
  return (
    <>
      <h2 id="staff-requests" className={styles.heading}>
        {c.title}
      </h2>
      <p className={styles.text}>{c.lead}</p>
      <nav aria-label={c.filterLabel} className={styles.segments}>
        {(['all', 'open', 'overdue'] as const).map((f) => (
          <a
            key={f}
            className={styles.segment}
            href={baseHref(f)}
            aria-current={filter === f ? 'true' : undefined}
            data-filter={f}
          >
            {c[f]}
          </a>
        ))}
      </nav>
      <p className={styles.summary} role="status" data-testid="requests-summary">
        {c.summary(rows.length, overdueCount)}
      </p>
      {rows.length === 0 ? (
        <p className={styles.text}>{c.empty}</p>
      ) : (
        <div
          className={styles.tableWrap}
          role="region"
          tabIndex={0}
          aria-label={c.caption}
        >
          <table className={styles.table} data-testid="requests-overview">
            <caption className={styles.srOnly}>{c.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{c.colProject}</th>
                <th scope="col">{c.colCategory}</th>
                <th scope="col">{c.colDeadline}</th>
                <th scope="col">{c.colStatus}</th>
                <th scope="col">{c.colMessage}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.requestId}
                  data-request-id={r.requestId}
                  data-status={r.status}
                >
                  <th scope="row">
                    <a href={entryHref(r.entryId)}>{r.projectTitle || '–'}</a>
                  </th>
                  <td>{r.categoryName[locale]}</td>
                  <td className={styles.nowrap}>
                    <time dateTime={r.deadlineAt.toISOString()}>
                      {stamp(r.deadlineAt)}
                    </time>
                  </td>
                  <td>
                    <span className={styles.tag} data-status={r.status}>
                      {s[r.status]}
                    </span>
                  </td>
                  <td className={styles.wrap}>
                    {r.message.length > 140 ? `${r.message.slice(0, 140)}…` : r.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
