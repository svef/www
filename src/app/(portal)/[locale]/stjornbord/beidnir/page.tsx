import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { listStaffRequests } from '@/lib/awards/requests/queries'
import { serverNow } from '@/lib/awards/staff/clock'
import { getStaffEdition } from '@/lib/awards/staff/queries'
import { isLocale, localePath } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { adminCopy } from '../copy'
import { requestCopy } from '../request-copy'
import { RequestsOverview, type RequestFilter } from './RequestsOverview'
import styles from '../admin.module.scss'

/**
 * Stjórnborð → Beiðnir: every unresolved request to entrants in the edition, judged on the
 * admin clock, overdue first. `?requests=open|overdue` narrows it, so a view is a link.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: requestCopy[locale].overview.title }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function AdminRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ year?: string; requests?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath(ADMIN.requests, locale)
  await requireAdmin({ locale, next: here })
  const search = await searchParams
  const db = getAwardsDb()
  const year = Number(one(search.year))
  const edition = await getStaffEdition(db, Number.isInteger(year) ? year : undefined)
  if (!edition) notFound()

  const all = await listStaffRequests(db, { editionId: edition.id, now: serverNow() })
  const asked = one(search.requests)
  const filter: RequestFilter = asked === 'open' || asked === 'overdue' ? asked : 'all'
  const shown = all.filter((r) => filter === 'all' || r.status === filter)
  const href = (f: RequestFilter) => {
    const qs = new URLSearchParams()
    if (one(search.year)) qs.set('year', String(edition.year))
    if (f !== 'all') qs.set('requests', f)
    const s = qs.toString()
    return s ? `${here}?${s}` : here
  }
  const c = requestCopy[locale].overview

  return (
    <>
      <AppHead title={c.title} eyebrow={adminCopy[locale].eyebrow} lede={c.lead} />
      <div className={styles.page}>
        <section aria-label={c.caption} data-testid="requests-overview-section" className={styles.listSection}>
          <RequestsOverview
            locale={locale}
            rows={shown}
            overdueCount={all.filter((r) => r.status === 'overdue').length}
            filter={filter}
            baseHref={href}
          />
        </section>
      </div>
    </>
  )
}
