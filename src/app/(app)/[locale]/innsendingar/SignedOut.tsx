import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { getProjectFormCopy } from '@/components/ProjectForm/copy'
import type { Locale } from '@/lib/i18n'

/**
 * What the form pages show to someone who is not signed in. Deliberately plain: it
 * links nowhere, because the sign-in page belongs to the accounts work (#158). When
 * `getCurrentUserId()` is swapped for `requireUser()` at integration, that redirects
 * to sign-in with `?next=` and this is only reached by a stray render.
 */
export function SignedOut({ locale }: { locale: Locale }) {
  const copy = getProjectFormCopy(locale)
  return (
    <>
      <PageHead title={copy.signedOutTitle} locale={locale} lede={copy.signedOutBody} />
      <PageSection last aria-label={copy.signedOutTitle}>
        <p>{copy.signedOutBody}</p>
      </PageSection>
    </>
  )
}
