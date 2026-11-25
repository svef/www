import { desc, isNull } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { AppHead } from '@/components/AppHead/AppHead'
import { dashboardCopy } from '@/components/Dashboard/copy'
import { PageSection } from '@/components/PageSection/PageSection'
import { getProjectFormCopy } from '@/components/ProjectForm/copy'
import { SECTIONS } from '@/components/ProjectForm/sections'
import { getAwardsDb } from '@/lib/awards/db/client'
import { edition } from '@/lib/awards/db/schema'
import { isLocale, localePath } from '@/lib/i18n'
import { requireViewer } from '@/lib/awards/auth/viewer'
import { PORTAL } from '@/lib/portal/paths'
import styles from '../../form-page.module.scss'
import { createProjectAction } from './actions'
import { CreateButton } from './CreateButton'

/**
 * "New submission": creating a project. Creating is a POST (a button), never a GET, so a
 * prefetch or a crawler can't make projects. Per request, like the form itself. The page
 * says what the form will ask, step by step, in the form's own words.
 */
export default async function NewSubmissionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const copy = getProjectFormCopy(locale)

  await requireViewer({ locale, next: localePath(PORTAL.newProject, locale) })

  // The edition new projects go into: the latest one.
  const [ed] = await getAwardsDb()
    .select({ year: edition.year })
    .from(edition)
    .where(isNull(edition.deletedAt))
    .orderBy(desc(edition.year))
    .limit(1)

  return (
    <>
      <AppHead
        title={copy.newTitle}
        lede={copy.newLead}
        eyebrow={ed ? copy.eyebrow(ed.year) : undefined}
        crumb={{
          href: localePath(PORTAL.projects, locale),
          label: dashboardCopy[locale].title,
        }}
      />
      <PageSection last className={styles.newSection} aria-labelledby="new-steps">
        <div className={styles.newBody}>
          <h2 id="new-steps" className={styles.newStepsTitle}>
            {copy.newSteps}
          </h2>
          <ol className={styles.newSteps}>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <span className={styles.newNum} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.newStepText}>
                  <span className={styles.newStepName}>{copy.sections[s.id].title}</span>
                  {copy.sections[s.id].intro && (
                    <span className={styles.newStepIntro}>
                      {copy.sections[s.id].intro}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <form action={createProjectAction} className={styles.newForm}>
            <input type="hidden" name="locale" value={locale} />
            <CreateButton label={copy.newButton} />
          </form>
        </div>
      </PageSection>
    </>
  )
}
