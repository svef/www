import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AppHead } from '@/components/AppHead/AppHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { getProjectFormCopy } from '@/components/ProjectForm/copy'
import { listBillingProfiles } from '@/lib/awards/billing/service'
import { getAwardsDb } from '@/lib/awards/db/client'
import { getCategory } from '@/lib/awards/categories'
import { getField } from '@/lib/awards/fields'
import { AwardsError } from '@/lib/awards/projects/errors'
import { listRequestsForProject } from '@/lib/awards/requests/queries'
import { loadProject } from '@/lib/awards/projects/service'
import { getCurrentUserId, getRequestNow, NotSignedInError } from '@/lib/awards/session'
import { eq } from 'drizzle-orm'
import { dashboardCopy } from '@/components/Dashboard/copy'
import { edition } from '@/lib/awards/db/schema'
import { isLocale, localePath } from '@/lib/i18n'
import { PORTAL } from '@/lib/portal/paths'
import styles from '../../form-page.module.scss'
import { ProjectFormClient } from './ProjectFormClient'
import { signInPath } from '@/lib/awards/auth/roles'

/**
 * The project form (`/is/minar-sidur/verkefni/<id>` · `/en/my-pages/projects/<id>`). It is about one
 * signed-in person's data, so it is rendered per request: it reads the session cookie,
 * which opts the route out of prerendering without any `force-dynamic`. Not indexable.
 * Opening it does not take the edit lock (a GET must not have side effects, and
 * prefetching would take it): the client takes it once the page is on screen.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isLocale(locale) || !UUID.test(id)) notFound()
  const copy = getProjectFormCopy(locale)

  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch (e) {
    if (e instanceof NotSignedInError)
      redirect(signInPath(locale, localePath(PORTAL.project(id), locale)))
    throw e
  }

  let view
  let billingProfiles
  let requests
  let year: number | undefined
  try {
    const db = getAwardsDb()
    const now = await getRequestNow()
    view = await loadProject(db, { userId, projectId: id, now })
    billingProfiles = await listBillingProfiles(db, { userId })
    // `loadProject` has proved the viewer is the creator or an accepted editor.
    requests = await listRequestsForProject(db, id, now)
    const [ed] = await db
      .select({ year: edition.year })
      .from(edition)
      .where(eq(edition.id, view.editionId))
    year = ed?.year
  } catch (e) {
    // Missing and not-yours look the same: a project's existence is not for strangers.
    if (e instanceof AwardsError && (e.code === 'not_found' || e.code === 'forbidden')) notFound()
    throw e
  }

  return (
    <>
      <AppHead
        title={(view.answers.title as string | undefined) || copy.pageTitle}
        eyebrow={year ? copy.eyebrow(year) : undefined}
        crumb={{
          href: localePath(PORTAL.projects, locale),
          label: dashboardCopy[locale].title,
        }}
      />
      <PageSection last className={styles.formSection} aria-label={copy.pageTitle}>
        <ProjectFormClient
          initial={view}
          locale={locale}
          billingProfiles={billingProfiles}
          requests={requests.map((r) => ({
            id: r.id,
            categoryName: getCategory(r.category)?.name[locale] ?? r.category,
            message: r.message,
            fields: r.fieldKeys.map((key) => {
              let label = key
              try {
                label = getField(key).label[locale]
              } catch {
                // A key no longer in the field set: shown as it is.
              }
              return { key, label }
            }),
            deadlineAt: r.deadlineAt.toISOString(),
            status: r.status,
            resolvedAt: r.resolvedAt?.toISOString() ?? null,
            replies: r.replies.map((p) => ({
              id: p.id,
              side: p.side,
              authorName: p.authorName,
              message: p.message,
              createdAt: p.createdAt.toISOString(),
            })),
          }))}
        />
      </PageSection>
    </>
  )
}
