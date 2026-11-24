import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireStaff } from '@/lib/awards/auth/session'
import { serverNow } from '@/lib/awards/staff/clock'
import { ELIGIBILITY_TARGETS } from '@/lib/awards/staff/eligibility'
import {
  getStaffEdition,
  listEligibilityRows,
  listStaffCategories,
} from '@/lib/awards/staff/queries'
import { ENTRY_STATUSES, type EntryStatus } from '@/lib/awards/types'
import { lastDayBefore } from '@/lib/awards/public-catalog'
import { allowedTransitions } from '@/lib/awards/status'
import { formatLongDate } from '@/lib/dates'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { setEligibilityAction } from './actions'
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
  changed?: string
  result?: string
  skip?: string | string[]
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
  const categoryId = categories.some((x) => x.id === one(search.category))
    ? one(search.category)
    : undefined
  const status = (ENTRY_STATUSES as readonly string[]).includes(one(search.status) ?? '')
    ? (one(search.status) as EntryStatus)
    : undefined
  const rows = await listEligibilityRows(db, { editionId: edition.id, categoryId, status })

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

  const exportHref = (format: 'csv' | 'xlsx') =>
    `/api/awards/staff/export?format=${format}&year=${edition.year}`
  const keep = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="year" value={edition.year} />
      {categoryId && <input type="hidden" name="category" value={categoryId} />}
      {status && <input type="hidden" name="status" value={status} />}
    </>
  )
  const targetsFor = (from: EntryStatus) =>
    ELIGIBILITY_TARGETS.filter((to) =>
      allowedTransitions(from).some((t) => t.to === to && t.actors.includes('staff')),
    )

  return (
    <>
      <PageHead title={c.title} lede={c.lede(edition.year)} locale={locale} />

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

      <PageSection aria-labelledby="staff-eligibility" last>
        <h2 id="staff-eligibility" className={styles.heading}>
          {c.eligibilityTitle}
        </h2>
        <p className={styles.text}>{closed ? c.closedNote(lastDayText) : c.notClosed(lastDayText)}</p>

        <form method="get" action={here} className={styles.filter}>
          <input type="hidden" name="year" value={edition.year} />
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
            <select name="status" defaultValue={status ?? ''}>
              <option value="">{c.all}</option>
              {ENTRY_STATUSES.filter((s) => s !== 'draft' && s !== 'withdrawn').map((s) => (
                <option key={s} value={s}>
                  {c.status[s]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={styles.button}>
            {c.filter}
          </button>
        </form>

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
                    <th scope="col">{c.colProject}</th>
                    <th scope="col">{c.colCategory}</th>
                    <th scope="col">{c.colCompany}</th>
                    <th scope="col">{c.colSubmitted}</th>
                    <th scope="col">{c.colStatus}</th>
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
                      <th scope="row">{r.projectTitle || '–'}</th>
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
      </PageSection>
    </>
  )
}
