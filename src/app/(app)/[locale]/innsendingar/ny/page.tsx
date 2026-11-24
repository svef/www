import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/Button/Button'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { getProjectFormCopy } from '@/components/ProjectForm/copy'
import { getCurrentUserId, NotSignedInError } from '@/lib/awards/session'
import { isLocale, localePath } from '@/lib/i18n'
import { signInPath } from '@/lib/awards/auth/roles'
import { createProjectAction } from './actions'

/**
 * "New submission": the simplest way to start a project until the dashboard exists.
 * Creating is a POST (a button), never a GET, so a prefetch or a crawler can't make
 * projects. Per request, like the form itself.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function NewSubmissionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const copy = getProjectFormCopy(locale)

  try {
    await getCurrentUserId()
  } catch (e) {
    if (e instanceof NotSignedInError)
      redirect(signInPath(locale, localePath('/innsendingar/ny', locale)))
    throw e
  }

  return (
    <>
      <PageHead title={copy.newTitle} locale={locale} lede={copy.newLead} />
      <PageSection last aria-label={copy.newTitle}>
        <form action={createProjectAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit">
            {copy.newButton}
          </Button>
        </form>
      </PageSection>
    </>
  )
}
