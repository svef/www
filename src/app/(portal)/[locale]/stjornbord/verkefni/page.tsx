import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { serverNow } from '@/lib/awards/staff/clock'
import { ELIGIBILITY_TARGETS } from '@/lib/awards/staff/eligibility'
import {
  BILLING_FILTERS,
  listStaffEntries,
  parseListSearch,
  STATUS_FILTERS,
  type SortKey,
} from '@/lib/awards/staff/entry-list'
import { getStaffEdition, listStaffCategories } from '@/lib/awards/staff/queries'
import type { EntryStatus } from '@/lib/awards/types'
import { lastDayBefore } from '@/lib/awards/public-catalog'
import { allowedTransitions } from '@/lib/awards/status'
import { formatLongDate } from '@/lib/dates'
import { isLocale, localePath } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { inputClass } from '@/components/FormParts/FormParts'
import { GrowText } from '@/components/GrowText/GrowText'
import { Pager } from '../Pager'
import { setEligibilityAction } from './actions'
import { adminCopy } from '../copy'
import styles from '../admin.module.scss'
import { ownValue } from '@/lib/own-key'

/**
 * Stjórnborð → Verkefni: every entry of an edition, one row per (project, category). Search,
 * filters, sorting and paging are all query parameters, read by `parseListSearch` and done in
 * the database, so a view can be linked and the page holds up at hundreds of entries. A row
 * opens the entry; eligibility is set here, one row at a time or for the selected rows.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: adminCopy[locale].title }
}

type Search = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function AdminProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Search>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath(ADMIN.projects, locale)
  await requireAdmin({ locale, next: here })

  const c = adminCopy[locale]
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
    billing: list.billing,
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
    const [id, reason = ''] = s.split(':')
    return { id, reason }
  })
  const titleById = new Map(rows.map((r) => [r.entryId, r.projectTitle]))
  const changed = Number(one(search.changed))

  const keep = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="year" value={edition.year} />
      {categoryId && <input type="hidden" name="category" value={categoryId} />}
      <input type="hidden" name="status" value={list.status} />
      <input type="hidden" name="billing" value={list.billing} />
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
    if (list.billing !== 'any') qs.set('billing', list.billing)
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
        >
          {label}
          <span className={styles.srOnly}>, {c.sortBy(label)}</span>
        </a>
      </th>
    )
  }
  const entryHref = (id: string) => localePath(ADMIN.entry(id), locale)
  const targetsFor = (from: EntryStatus) =>
    ELIGIBILITY_TARGETS.filter((to) =>
      allowedTransitions(from).some((t) => t.to === to && t.actors.includes('staff')),
    )
  const filtered =
    !!categoryId || list.status !== 'submitted' || list.billing !== 'any' || list.q !== ''

  return (
    <>
      <AppHead title={c.heading} eyebrow={c.eyebrow} lede={c.projectsLede(edition.year)} />

      <div className={styles.page}>
        {(search.changed !== undefined || one(search.result) === 'none') && (
          <div role="status" className={styles.result} data-testid="result">
            {one(search.result) === 'none' ? (
              <p>{c.nothing}</p>
            ) : (
              <>
                <p className={styles.resultTitle}>{c.changed(changed)}</p>
                {skipped.length > 0 && (
                  <>
                    <p>{c.skipped(skipped.length)}</p>
                    <ul>
                      {skipped.map((s) => (
                        <li key={s.id}>
                          {titleById.get(s.id) ?? s.id}: {ownValue(c.reason, s.reason) ?? s.reason}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <section aria-labelledby="staff-eligibility" className={styles.listSection}>
          <h2 id="staff-eligibility" className={styles.srOnly}>
            {c.eligibilityTitle}
          </h2>

          <form method="get" action={here} className={styles.filter} role="search" aria-label={c.filtersLabel}>
            <input type="hidden" name="year" value={edition.year} />
            <input type="hidden" name="sort" value={list.sort} />
            <input type="hidden" name="dir" value={list.dir} />
            <div className={`${styles.field} ${styles.searchField}`}>
              <label htmlFor="admin-search">{c.search}</label>
              <input
                id="admin-search"
                type="search"
                name="q"
                defaultValue={list.q}
                maxLength={100}
                className={inputClass}
                aria-describedby="admin-search-hint"
              />
              <small id="admin-search-hint" className={styles.hint}>
                {c.searchHint}
              </small>
            </div>
            <label className={styles.field}>
              <span>{c.filterCategory}</span>
              <select name="category" defaultValue={categoryId ?? ''} className={inputClass}>
                <option value="">{c.all}</option>
                {categories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{c.filterStatus}</span>
              <select name="status" defaultValue={list.status} className={inputClass}>
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'submitted' ? c.statusSubmitted : s === 'all' ? c.statusAll : c.status[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{c.filterBilling}</span>
              <select name="billing" defaultValue={list.billing} className={inputClass}>
                {BILLING_FILTERS.map((b) => (
                  <option key={b} value={b}>
                    {c.billing[b]}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="submit" className={`btn-grow ${styles.secondary}`}>
                <GrowText>{c.filter}</GrowText>
              </button>
              {filtered && (
                <a className={styles.quiet} href={`${here}?year=${edition.year}`}>
                  {c.reset}
                </a>
              )}
            </div>
          </form>

          <p className={styles.text}>{closed ? c.closedNote(lastDayText) : c.notClosed(lastDayText)}</p>

          <p className={styles.summary} role="status" data-testid="list-summary">
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
              <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={c.tableRegion}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>{c.tableCaption}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.checkCol}>
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
                        <td className={styles.checkCol}>
                          <input
                            type="checkbox"
                            name="entry"
                            value={r.entryId}
                            aria-label={`${c.select}: ${r.projectTitle}, ${r.categoryName}`}
                          />
                        </td>
                        <th scope="row">
                          <a href={entryHref(r.entryId)}>{r.projectTitle || '–'}</a>
                          <span className={styles.cellNote}>{r.creatorEmail}</span>
                        </th>
                        <td>{r.categoryName}</td>
                        <td>
                          {r.company ?? <span className={styles.muted}>{c.noCompany}</span>}
                          {r.exported && <span className={styles.cellNote}>{c.exportedTag}</span>}
                        </td>
                        <td className={styles.nowrap}>
                          {r.submittedAt ? (
                            <time dateTime={r.submittedAt.toISOString()}>
                              {r.submittedAt.toISOString().slice(0, 10)}
                            </time>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td>
                          <span className={styles.tag} data-status={r.status}>
                            {c.status[r.status]}
                          </span>
                        </td>
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
                <label className={styles.field}>
                  <span>{c.bulkLabel}</span>
                  <select name="to" defaultValue="eligibility_pending" className={inputClass}>
                    {ELIGIBILITY_TARGETS.map((to) => (
                      <option key={to} value={to}>
                        {c.target[to]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`btn-grow ${styles.primary}`} disabled={!closed}>
                  <GrowText>{c.bulkButton}</GrowText>
                </button>
              </div>
            </form>
          )}

          <Pager
            locale={locale}
            page={result.page}
            pageCount={result.pageCount}
            href={(page) => listHref({ page })}
          />
        </section>
      </div>
    </>
  )
}
