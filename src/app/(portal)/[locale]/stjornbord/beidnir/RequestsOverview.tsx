import type { StaffRequestRow } from '@/lib/awards/requests/queries'
import { localePath, type Locale } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { requestCopy } from '../request-copy'
import styles from '../admin.module.scss'

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

export type RequestFilter = 'all' | 'open' | 'overdue'

/** Every unresolved request, overdue first (Stjórnborð → Beiðnir). */
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
  /** The page's URL for each filter. */
  baseHref: (filter: RequestFilter) => string
}) {
  const c = requestCopy[locale].overview
  const s = requestCopy[locale].status
  const entryHref = (id: string) => localePath(ADMIN.entry(id), locale) + '#requests'
  return (
    <>
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
