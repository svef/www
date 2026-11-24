import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Dashboard } from '@/components/Dashboard/Dashboard'
import { dashboardCopy } from '@/components/Dashboard/copy'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { signInPath } from '@/lib/awards/auth/roles'
import { deadlineLine } from '@/lib/awards/dashboard/deadline'
import { invoiceNotes, entriesWithoutBilling } from '@/lib/awards/dashboard/invoice'
import { loadDashboard } from '@/lib/awards/dashboard/queries'
import { needsAction } from '@/lib/awards/dashboard/rank'
import { getAwardsDb } from '@/lib/awards/db/client'
import { getCurrentUserId, getRequestNow, NotSignedInError } from '@/lib/awards/session'
import { isLocale, localePath } from '@/lib/i18n'

/**
 * "Mínar innsendingar" (`/is/innsendingar/minar` · `/en/submissions/mine`): the landing page
 * after sign-in. One signed-in person's projects, so it is rendered per request (it reads the
 * session cookie, which opts the route out of prerendering without `force-dynamic`) and is not
 * indexable. Signed out, it sends the reader to sign-in and back here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: dashboardCopy[locale].title, robots: { index: false, follow: false } }
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath('/innsendingar/minar', locale)

  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch (e) {
    if (e instanceof NotSignedInError) redirect(signInPath(locale, here))
    throw e
  }

  const now = await getRequestNow()
  const data = await loadDashboard(getAwardsDb(), { userId, now })
  if (!data) notFound()
  const c = dashboardCopy[locale]
  const ctx = { now, ...data.edition }

  return (
    <>
      <PageHead title={c.title} locale={locale} lede={c.lede} />
      <PageSection last aria-label={c.title}>
        <Dashboard
          locale={locale}
          data={data}
          deadline={deadlineLine(now, data.edition)}
          notes={invoiceNotes(data.projects)}
          withoutBilling={entriesWithoutBilling(data.projects)}
          needsActionIds={data.projects.filter((p) => needsAction(p, ctx)).map((p) => p.id)}
          signOutTo={localePath('/innskraning', locale)}
        />
      </PageSection>
    </>
  )
}
