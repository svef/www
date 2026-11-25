import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { desc, isNull } from 'drizzle-orm'
import { countEdition, recentActivity } from '@/lib/awards/admin/overview'
import { userEventKey } from '@/lib/awards/admin/users'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { edition as editionTable } from '@/lib/awards/db/schema'
import { listStaffRequests } from '@/lib/awards/requests/queries'
import { serverNow } from '@/lib/awards/staff/clock'
import { ENTRY_STATUSES, SUBMITTED_LIKE_STATUSES, type EntryStatus } from '@/lib/awards/types'
import { lastDayBefore } from '@/lib/awards/public-catalog'
import { formatDate, formatNumber } from '@/lib/locale-format'
import { isLocale, localePath } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { adminCopy } from './copy'
import { entryCopy } from './entry-copy'
import { overviewCopy } from './overview-copy'
import { requestCopy } from './request-copy'
import styles from './admin.module.scss'
import { ownValue } from '@/lib/own-key'

/**
 * Stjórnborð → Staðan, the admin's landing page: the edition in numbers, its deadlines and the
 * next request deadlines, entries counted by category and status (each count a link to that
 * view of the projects list), and the latest changes from both event logs.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: overviewCopy[locale].title }
}

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  await requireAdmin({ locale, next: localePath(ADMIN.overview, locale) })
  const c = overviewCopy[locale]
  const status = adminCopy[locale].status
  const db = getAwardsDb()
  const [ed] = await db
    .select()
    .from(editionTable)
    .where(isNull(editionTable.deletedAt))
    .orderBy(desc(editionTable.year))
    .limit(1)
  if (!ed) notFound()

  const now = serverNow()
  const [counts, requests, activity] = await Promise.all([
    countEdition(db, ed.id),
    listStaffRequests(db, { editionId: ed.id, now }),
    recentActivity(db, 12),
  ])
  const overdue = requests.filter((r) => r.status === 'overdue').length
  const submitted = SUBMITTED_LIKE_STATUSES.reduce((n, s) => n + counts.totals[s], 0)
  const num = (n: number) => formatNumber(n, locale)
  const projectsHref = (q: { status?: string; category?: string } = {}) => {
    const qs = new URLSearchParams({ year: String(ed.year), status: q.status ?? 'all' })
    if (q.category) qs.set('category', q.category)
    return `${localePath(ADMIN.projects, locale)}?${qs}`
  }
  const requestsHref = (f?: 'overdue') =>
    `${localePath(ADMIN.requests, locale)}${f ? `?requests=${f}` : ''}`
  const deadlines = [
    { key: 'early', label: c.earlyBird, bound: ed.earlyBirdEndsBefore },
    { key: 'closes', label: c.closes, bound: ed.intakeClosesBefore },
  ]
  const events = entryCopy[locale].events
  // The columns worth a column: every status that has an entry, in the workflow's order.
  const columns = ENTRY_STATUSES.filter((s) => counts.totals[s] > 0) as EntryStatus[]

  return (
    <>
      <AppHead title={c.title} eyebrow={adminCopy[locale].eyebrow} lede={c.lede(ed.year)} />
      <div className={styles.page}>
        <section aria-label={c.statsLabel}>
          <ul className={styles.stats}>
            {[
              {
                key: 'projects',
                label: c.stats.projects,
                value: counts.projects,
                note: counts.noCategory > 0 ? c.noCategory(counts.noCategory) : undefined,
                href: projectsHref(),
              },
              { key: 'submitted', label: c.stats.submitted, value: submitted, href: projectsHref({ status: 'submitted' }) },
              { key: 'drafts', label: c.stats.drafts, value: counts.totals.draft, href: projectsHref({ status: 'draft' }) },
              {
                key: 'requests',
                label: c.stats.requests,
                value: requests.length,
                note: c.overdue(overdue),
                href: requestsHref(overdue > 0 ? 'overdue' : undefined),
                attention: overdue > 0,
              },
            ].map((stat) => (
              <li key={stat.key}>
                <a className={styles.stat} href={stat.href} data-stat={stat.key} data-attention={stat.attention || undefined}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <span className={styles.statValue}>{num(stat.value)}</span>
                  {stat.note && <span className={styles.statNote}>{stat.note}</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.columns}>
          <section aria-labelledby="overview-deadlines" className={styles.part}>
            <h2 id="overview-deadlines" className={styles.heading}>
              {c.deadlinesTitle}
            </h2>
            <dl className={styles.facts}>
              {deadlines.map((d) => (
                <div key={d.key} className={styles.fact}>
                  <dt>{d.label}</dt>
                  <dd>
                    <time dateTime={lastDayBefore(d.bound.toISOString()).slice(0, 10)}>
                      {formatDate(lastDayBefore(d.bound.toISOString()), locale)}
                    </time>
                    {now >= d.bound && <span className={styles.muted}> ({c.passed})</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <h3 className={styles.subheading}>{c.requestsTitle}</h3>
            {requests.length === 0 ? (
              <p className={styles.text}>{c.requestsNone}</p>
            ) : (
              <ul className={styles.deadlineList} data-testid="overview-requests">
                {requests.slice(0, 6).map((r) => (
                  <li key={r.requestId} data-status={r.status}>
                    <a href={`${localePath(ADMIN.entry(r.entryId), locale)}#requests`}>
                      {r.projectTitle || c.untitled}
                    </a>
                    <span className={styles.cellNote}>
                      {r.categoryName[locale]} ·{' '}
                      <time dateTime={r.deadlineAt.toISOString()}>
                        {formatDate(r.deadlineAt.toISOString(), locale, { time: true })}
                      </time>
                    </span>
                    {r.status === 'overdue' && (
                      <span className={styles.tag} data-status="overdue">
                        {requestCopy[locale].status.overdue}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.moreLink}>
              <a href={requestsHref()}>{c.allRequests}</a>
            </p>
          </section>

          <section aria-labelledby="overview-tools" className={styles.part}>
            <h2 id="overview-tools" className={styles.heading}>
              {c.toolsTitle}
            </h2>
            <p className={styles.text}>{c.toolsLead}</p>
            <p className={styles.moreLink}>
              <a href={localePath(ADMIN.tools, locale)}>{c.toolsLink}</a>
            </p>
          </section>
        </div>

        <section aria-labelledby="overview-counts" className={styles.part}>
          <h2 id="overview-counts" className={styles.heading}>
            {c.countsTitle}
          </h2>
          <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={c.countsRegion}>
            <table className={`${styles.table} ${styles.counts}`} data-testid="overview-counts">
              <caption className={styles.srOnly}>{c.countsCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{c.category}</th>
                  {columns.map((s) => (
                    <th key={s} scope="col" className={styles.num}>
                      {status[s]}
                    </th>
                  ))}
                  <th scope="col" className={styles.num}>
                    {c.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                {counts.categories.map((cat) => (
                  <tr key={cat.id} data-category={cat.id}>
                    <th scope="row">{cat.name[locale]}</th>
                    {columns.map((s) => (
                      <td key={s} className={styles.num}>
                        {cat.counts[s] > 0 ? (
                          <a
                            href={projectsHref({ status: s, category: cat.id })}
                            aria-label={c.showEntries(cat.counts[s], cat.name[locale], status[s])}
                          >
                            {num(cat.counts[s])}
                          </a>
                        ) : (
                          <span className={styles.muted}>0</span>
                        )}
                      </td>
                    ))}
                    <td className={styles.num}>
                      {cat.total > 0 ? (
                        <a href={projectsHref({ category: cat.id })}>{num(cat.total)}</a>
                      ) : (
                        <span className={styles.muted}>0</span>
                      )}
                    </td>
                  </tr>
                ))}
                {counts.noCategory > 0 && (
                  // Projects with no category yet have no entry, so no status either.
                  <tr data-category="none">
                    <th scope="row">{c.noCategoryRow}</th>
                    {columns.map((s) => (
                      <td key={s} className={styles.num}>
                        <span className={styles.muted}>–</span>
                      </td>
                    ))}
                    <td className={styles.num}>
                      <a
                        href={projectsHref({ status: 'no_category' })}
                        aria-label={c.noCategoryLink(counts.noCategory)}
                      >
                        {num(counts.noCategory)}
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{c.total}</th>
                  {columns.map((s) => (
                    <td key={s} className={styles.num}>
                      {num(counts.totals[s])}
                    </td>
                  ))}
                  {/* Every row of the projects list's "all" view, which this footer links to. */}
                  <td className={styles.num}>{num(counts.entries + counts.noCategory)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className={styles.moreLink}>
            <a href={projectsHref()}>{c.allEntries}</a>
          </p>
        </section>

        <section aria-labelledby="overview-activity" className={styles.part}>
          <h2 id="overview-activity" className={styles.heading}>
            {c.activityTitle}
          </h2>
          {activity.length === 0 ? (
            <p className={styles.text}>{c.activityNone}</p>
          ) : (
            <ol className={styles.activity} data-testid="overview-activity">
              {activity.map((a) => (
                <li key={a.id}>
                  <time dateTime={a.at.toISOString()} className={styles.activityWhen}>
                    {formatDate(a.at.toISOString(), locale, { time: true })}
                  </time>
                  {a.kind === 'entry' ? (
                    <span>
                      <strong>{a.actorName ?? c.system}</strong>: {ownValue(events, a.type) ?? a.type}{' '}
                      {a.entryId ? (
                        <a href={localePath(ADMIN.entry(a.entryId), locale)}>{a.subject || c.untitled}</a>
                      ) : (
                        a.subject || c.untitled
                      )}
                      {a.categoryName && <span className={styles.muted}> ({a.categoryName[locale]})</span>}
                    </span>
                  ) : (
                    <span>
                      <strong>{a.actorName ?? c.system}</strong> {ownValue(c.userEvents, userEventKey(a.type, a.data)) ?? a.type}{' '}
                      {a.userId ? <a href={localePath(ADMIN.user(a.userId), locale)}>{a.subject}</a> : a.subject}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
