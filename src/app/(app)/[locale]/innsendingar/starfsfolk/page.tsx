import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireStaff } from '@/lib/awards/auth/session'
import { serverNow } from '@/lib/awards/staff/clock'
import { ELIGIBILITY_TARGETS } from '@/lib/awards/staff/eligibility'
import {
  listStaffEntries,
  parseListSearch,
  STATUS_FILTERS,
  type SortKey,
} from '@/lib/awards/staff/entry-list'
import { listStaffRequests } from '@/lib/awards/requests/queries'
import { getStaffEdition, listStaffCategories } from '@/lib/awards/staff/queries'
import type { EntryStatus } from '@/lib/awards/types'
import { lastDayBefore } from '@/lib/awards/public-catalog'
import { allowedTransitions } from '@/lib/awards/status'
import { formatLongDate } from '@/lib/dates'
import { isLocale, localePath } from '@/lib/i18n'
import { AppHead } from '@/components/AppHead/AppHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { RequestsOverview, type RequestFilter } from './RequestsOverview'
import { sendRemindersNowAction, setEligibilityAction } from './actions'
import { staffCopy } from './copy'
import styles from './staff.module.scss'

/**
 * Staff only, so it is rendered per request (it reads the session cookie) and never
 * prerendered. A plain page on purpose: svef/www#168 builds the staff area and folds this
 * in; a design pass comes after.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: staffCopy[locale].title, robots: { index: false, follow: false } }
}

type Search = {
  year?: string
  category?: string
  status?: string
  q?: string
  sort?: string
  dir?: string
  page?: string
  changed?: string
  result?: string
  skip?: string | string[]
  requests?: string
  reminders?: string
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Search>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath('/innsendingar/starfsfolk', locale)
  await requireStaff({ locale, next: here })

  const c = staffCopy[locale]
  const search = await searchParams
  const db = getAwardsDb()
  const year = Number(one(search.year))
  const edition = await getStaffEdition(db, Number.isInteger(year) ? year : undefined)
  if (!edition) notFound()

  const categories = await listStaffCategories(db, edition.id)
  const list = parseListSearch(search)
  const categoryId = categories.some((x) => x.id === list.categoryId) ? list.categoryId : undefined
  const result = await listStaffEntries(db, {
    editionId: edition.id,
    categoryId,
    status: list.status,
    search: list.q,
    sort: list.sort,
    dir: list.dir,
    page: list.page,
  })
  const rows = result.rows

  // The server clock, the one the rules use (the window is exclusive: closes *before*).
  const closed = serverNow() >= edition.intakeClosesBefore
  const lastDayText = formatLongDate(lastDayBefore(edition.intakeClosesBefore.toISOString()), locale)

  // What the last action did, from the redirect's query string.
  const skippedRaw = Array.isArray(search.skip) ? search.skip : search.skip ? [search.skip] : []
  const skipped = skippedRaw.map((s) => {
    const [id, reason] = s.split(':')
    return { id, reason: reason as keyof typeof c.reason }
  })
  const titleById = new Map(rows.map((r) => [r.entryId, r.projectTitle]))
  const changed = Number(search.changed)

  // Unresolved requests, judged on the staff clock; the filter narrows what is listed.
  const allRequests = await listStaffRequests(db, { editionId: edition.id, now: serverNow() })
  const requestFilter: RequestFilter =
    one(search.requests) === 'open' || one(search.requests) === 'overdue'
      ? (one(search.requests) as RequestFilter)
      : 'all'
  const shownRequests = allRequests.filter((r) => requestFilter === 'all' || r.status === requestFilter)
  const requestsHref = (f: RequestFilter) => {
    const qs = new URLSearchParams({ year: String(edition.year) })
    if (f !== 'all') qs.set('requests', f)
    return `${here}?${qs}#staff-requests`
  }

  // What "send reminders now" did: "<request reminders>.<draft reminders>.<failed>".
  const remindersParts = (one(search.reminders) ?? '').split('.').map(Number)
  const remindersResult =
    remindersParts.length === 3 && remindersParts.every((n) => Number.isInteger(n) && n >= 0)
      ? (remindersParts as [number, number, number])
      : null

  const exportHref = (format: 'csv' | 'xlsx') =>
    `/api/awards/staff/export?format=${format}&year=${edition.year}`
  const keep = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="year" value={edition.year} />
      {categoryId && <input type="hidden" name="category" value={categoryId} />}
      <input type="hidden" name="status" value={list.status} />
      {list.q && <input type="hidden" name="q" value={list.q} />}
      <input type="hidden" name="sort" value={list.sort} />
      <input type="hidden" name="dir" value={list.dir} />
      <input type="hidden" name="page" value={result.page} />
    </>
  )
  /** The list's own query string, with some parts replaced (sorting, paging). */
  const listHref = (over: { sort?: SortKey; dir?: 'asc' | 'desc'; page?: number }) => {
    const qs = new URLSearchParams({ year: String(edition.year) })
    if (categoryId) qs.set('category', categoryId)
    qs.set('status', list.status)
    if (list.q) qs.set('q', list.q)
    qs.set('sort', over.sort ?? list.sort)
    qs.set('dir', over.dir ?? list.dir)
    qs.set('page', String(over.page ?? result.page))
    return `${here}?${qs}`
  }
  const sortHeader = (key: SortKey, label: string) => {
    const active = list.sort === key
    return (
      <th scope="col" aria-sort={active ? (list.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <a
          className={styles.sortLink}
          href={listHref({ sort: key, dir: active && list.dir === 'asc' ? 'desc' : 'asc', page: 1 })}
          aria-label={c.sortBy(label)}
        >
          {label}
        </a>
      </th>
    )
  }
  const entryHref = (id: string) => localePath(`/innsendingar/starfsfolk/${id}`, locale)
  const targetsFor = (from: EntryStatus) =>
    ELIGIBILITY_TARGETS.filter((to) =>
      allowedTransitions(from).some((t) => t.to === to && t.actors.includes('staff')),
    )

  return (
    <>
      <AppHead title={c.title} lede={c.lede(edition.year)} />

      {(search.changed !== undefined || search.result === 'none') && (
        <PageSection aria-label="Niðurstaða">
          <div role="status" className={styles.result} data-testid="result">
            {search.result === 'none' ? (
              <p>{c.nothing}</p>
            ) : (
              <>
                <p>{c.changed(changed)}</p>
                {skipped.length > 0 && (
                  <>
                    <p>{c.skipped(skipped.length)}</p>
                    <ul>
                      {skipped.map((s) => (
                        <li key={s.id}>
                          {titleById.get(s.id) ?? s.id}: {c.reason[s.reason] ?? s.reason}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </PageSection>
      )}

      <PageSection aria-labelledby="staff-export">
        <h2 id="staff-export" className={styles.heading}>
          {c.exportTitle}
        </h2>
        <p className={styles.text}>{c.exportLead}</p>
        <p className={styles.actions}>
          <a className={styles.button} href={exportHref('csv')} download>
            {c.exportCsv}
          </a>
          <a className={styles.button} href={exportHref('xlsx')} download>
            {c.exportXlsx}
          </a>
        </p>
        <p className={styles.note}>{c.exportCsvNote}</p>
      </PageSection>

      <PageSection aria-labelledby="staff-requests" data-testid="requests-overview-section">
        <RequestsOverview
          locale={locale}
          rows={shownRequests}
          overdueCount={allRequests.filter((r) => r.status === 'overdue').length}
          filter={requestFilter}
          baseHref={requestsHref}
        />
      </PageSection>

      <PageSection aria-labelledby="staff-reminders">
        <h2 id="staff-reminders" className={styles.heading}>
          {c.remindersTitle}
        </h2>
        <p className={styles.text}>{c.remindersLead}</p>
        <form action={sendRemindersNowAction} className={styles.actions}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="year" value={edition.year} />
          <button type="submit" className={styles.button} data-testid="send-reminders">
            {c.remindersSend}
          </button>
        </form>
        {remindersResult && (
          <p role="status" className={styles.result} data-testid="reminders-result">
            {c.remindersResult(...remindersResult)}
          </p>
        )}
      </PageSection>

      <PageSection aria-labelledby="staff-eligibility" last>
        <h2 id="staff-eligibility" className={styles.heading}>
          {c.eligibilityTitle}
        </h2>
        <p className={styles.text}>{closed ? c.closedNote(lastDayText) : c.notClosed(lastDayText)}</p>

        <form method="get" action={here} className={styles.filter} role="search">
          <input type="hidden" name="year" value={edition.year} />
          <input type="hidden" name="sort" value={list.sort} />
          <input type="hidden" name="dir" value={list.dir} />
          <label>
            {c.filterCategory}
            <select name="category" defaultValue={categoryId ?? ''}>
              <option value="">{c.all}</option>
              {categories.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.filterStatus}
            <select name="status" defaultValue={list.status}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === 'submitted' ? c.statusSubmitted : s === 'all' ? c.statusAll : c.status[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.search}
            <input type="search" name="q" defaultValue={list.q} maxLength={100} />
          </label>
          <button type="submit" className={styles.button}>
            {c.filter}
          </button>
        </form>

        <p className={styles.text} role="status" data-testid="list-summary">
          {c.summary(
            (result.page - 1) * result.pageSize + 1,
            (result.page - 1) * result.pageSize + rows.length,
            result.total,
          )}
        </p>

        {rows.length === 0 ? (
          <p className={styles.text}>{c.empty}</p>
        ) : (
          <form action={setEligibilityAction}>
            {keep}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>{c.tableCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className={styles.srOnly}>{c.select}</span>
                    </th>
                    {sortHeader('title', c.colProject)}
                    {sortHeader('category', c.colCategory)}
                    {sortHeader('company', c.colCompany)}
                    {sortHeader('submitted', c.colSubmitted)}
                    {sortHeader('status', c.colStatus)}
                    <th scope="col">{c.colAction}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.entryId} data-entry={r.entryId}>
                      <td>
                        <input
                          type="checkbox"
                          name="entry"
                          value={r.entryId}
                          aria-label={`${c.select}: ${r.projectTitle}, ${r.categoryName}`}
                        />
                      </td>
                      <th scope="row">
                        <a href={entryHref(r.entryId)}>{r.projectTitle || '–'}</a>
                      </th>
                      <td>{r.categoryName}</td>
                      <td>{r.company ?? c.noCompany}</td>
                      <td>
                        {r.submittedAt ? (
                          <time dateTime={r.submittedAt.toISOString()}>
                            {r.submittedAt.toISOString().slice(0, 10)}
                          </time>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td data-status>{c.status[r.status]}</td>
                      <td>
                        <span className={styles.rowActions}>
                          {targetsFor(r.status).map((to) => (
                            <button
                              key={to}
                              type="submit"
                              name="single"
                              value={`${r.entryId}:${to}`}
                              className={styles.small}
                              disabled={!closed}
                              aria-label={`${c.target[to]}: ${r.projectTitle}, ${r.categoryName}`}
                            >
                              {c.target[to]}
                            </button>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.bulk}>
              <label>
                {c.bulkLabel}
                <select name="to" defaultValue="eligibility_pending">
                  {ELIGIBILITY_TARGETS.map((to) => (
                    <option key={to} value={to}>
                      {c.target[to]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={styles.button} disabled={!closed}>
                {c.bulkButton}
              </button>
            </div>
          </form>
        )}

        {result.pageCount > 1 && (
          <nav className={styles.pager} aria-label={c.pageNav}>
            {result.page > 1 ? (
              <a className={styles.button} href={listHref({ page: result.page - 1 })} rel="prev">
                {c.prev}
              </a>
            ) : null}
            <span aria-current="page">{c.pageOf(result.page, result.pageCount)}</span>
            {result.page < result.pageCount ? (
              <a className={styles.button} href={listHref({ page: result.page + 1 })} rel="next">
                {c.next}
              </a>
            ) : null}
          </nav>
        )}
      </PageSection>
    </>
  )
}
