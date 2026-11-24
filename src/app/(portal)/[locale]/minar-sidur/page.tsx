import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireViewer } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { attentionItems, projectTotals } from '@/lib/awards/dashboard/attention'
import { deadlineLine } from '@/lib/awards/dashboard/deadline'
import { entriesWithoutBilling, invoiceNotes } from '@/lib/awards/dashboard/invoice'
import { loadDashboard } from '@/lib/awards/dashboard/queries'
import { lastDayBefore } from '@/lib/awards/public-catalog'
import { getRequestNow } from '@/lib/awards/session'
import { formatDate, formatNumber } from '@/lib/locale-format'
import { isLocale, localePath } from '@/lib/i18n'
import { PORTAL } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { dashboardCopy } from '@/components/Dashboard/copy'
import { GrowText } from '@/components/GrowText/GrowText'
import { overviewCopy } from './overview-copy'
import styles from './overview.module.scss'

/**
 * Mínar síður → Yfirlit (`/is/minar-sidur` · `/en/my-pages`): where signing in lands. The awards
 * section's state for this person: anything that needs them (requests, drafts against a
 * deadline), the deadlines, their projects in numbers and invoices, and a way to start. The full
 * list with its bulk actions is "Verkefnin mín".
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

export default async function PortalOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const viewer = await requireViewer({ locale, next: localePath(PORTAL.overview, locale) })
  const c = overviewCopy[locale]
  const d = dashboardCopy[locale]
  const now = await getRequestNow()
  const data = await loadDashboard(getAwardsDb(), { userId: viewer.id, now })
  if (!data) notFound()

  const ctx = { now, ...data.edition }
  const attention = attentionItems(data.projects, ctx)
  const totals = projectTotals(data.projects)
  const notes = invoiceNotes(data.projects)
  const withoutBilling = entriesWithoutBilling(data.projects)
  const line = deadlineLine(now, data.edition)
  const deadlines = [
    { key: 'early', label: c.earlyBird, bound: data.edition.earlyBirdEndsBefore },
    { key: 'closes', label: c.closes, bound: data.edition.intakeClosesBefore },
  ]
  const href = (p: string) => localePath(p, locale)
  const num = (n: number) => formatNumber(n, locale)

  return (
    <>
      <AppHead
        title={c.title}
        eyebrow={d.eyebrow(data.edition.year)}
        lede={c.lede}
        actions={
          <Link href={href(PORTAL.newProject)} className={`btn-grow ${styles.primary}`}>
            <GrowText>{c.newProject}</GrowText>
          </Link>
        }
      />
      <div className={styles.page}>
        {!viewer.emailVerified && (
          <div className={styles.notice} role="note" data-testid="unverified">
            <p className={styles.noticeTitle}>{c.unverifiedTitle}</p>
            <p>{c.unverified(viewer.email)}</p>
          </div>
        )}

        <div className={styles.columns}>
          <section aria-labelledby="overview-attention" className={styles.part} data-testid="overview-attention">
            <h2 id="overview-attention" className={styles.heading}>
              {c.attentionTitle}
            </h2>
            {attention.length === 0 ? (
              <p className={styles.text}>{c.attentionNone}</p>
            ) : (
              <ul className={styles.attention}>
                {attention.map((a) => (
                  <li key={a.projectId} data-project={a.projectId}>
                    <Link href={href(PORTAL.project(a.projectId))} className={styles.attentionTitle}>
                      {a.title || c.untitled}
                    </Link>
                    <ul className={styles.reasons}>
                      {a.reasons.map((r) => (
                        <li key={r.kind} data-reason={r.kind} data-overdue={r.kind === 'request' && r.overdue ? '' : undefined}>
                          {r.kind === 'request'
                            ? c.request(r.count, r.deadlineAt, r.overdue, locale)
                            : c.drafts(r.count, r.missing, lastDayBefore(r.deadlineAt), locale)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.more}>
              <Link href={href(PORTAL.projects)}>{c.allProjects}</Link>
            </p>
          </section>

          <section aria-labelledby="overview-deadlines" className={styles.part}>
            <h2 id="overview-deadlines" className={styles.heading}>
              {c.deadlinesTitle}
            </h2>
            <p className={styles.deadline} data-deadline={line.kind}>
              {d.deadline(line, locale)}
            </p>
            <dl className={styles.dates}>
              {deadlines.map((x) => {
                const last = lastDayBefore(x.bound)
                return (
                  <div key={x.key}>
                    <dt>{x.label}</dt>
                    <dd>
                      <time dateTime={last.slice(0, 10)}>{formatDate(last, locale)}</time>
                      {now.getTime() >= Date.parse(x.bound) && <span className={styles.muted}> ({c.passed})</span>}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        </div>

        <section aria-labelledby="overview-summary" className={styles.part}>
          <h2 id="overview-summary" className={styles.heading}>
            {c.summaryTitle}
          </h2>
          <ul className={styles.stats}>
            {(['projects', 'submitted', 'drafts'] as const).map((k) => (
              <li key={k} className={styles.stat} data-stat={k}>
                <span className={styles.statLabel}>{c.stats[k]}</span>
                <span className={styles.statValue}>{num(totals[k])}</span>
              </li>
            ))}
          </ul>
          {(notes.length > 0 || withoutBilling > 0) && (
            <div className={styles.invoices}>
              <h3 className={styles.subheading}>{d.invoiceHeading}</h3>
              <ul>
                {notes.map((n) => (
                  <li key={n.billing.id}>{d.invoiceNote(n.total, n.billing.companyName, n.billing.kennitala, locale)}</li>
                ))}
                {withoutBilling > 0 && <li>{d.invoiceNoBilling(withoutBilling)}</li>}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="overview-start" className={styles.part}>
          <h2 id="overview-start" className={styles.heading}>
            {c.startTitle}
          </h2>
          <p className={styles.text}>{data.projects.length === 0 ? c.startEmpty : c.start}</p>
          <ul className={styles.quick}>
            <li>
              <Link href={href(PORTAL.newProject)} className={`btn-grow ${styles.secondary}`}>
                <GrowText>{c.newProject}</GrowText>
              </Link>
            </li>
            <li>
              <a href={href('/innsendingar')} className={`btn-grow ${styles.secondary}`}>
                <GrowText>{c.categories}</GrowText>
              </a>
            </li>
            <li>
              <Link href={href(PORTAL.account)} className={`btn-grow ${styles.secondary}`}>
                <GrowText>{c.account}</GrowText>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
