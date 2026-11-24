import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { ResendVerification } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import styles from '@/components/AccountForms/AccountForms.module.scss'
import { dashboardPath } from '@/lib/awards/auth/roles'
import { getUser } from '@/lib/awards/auth/session'
import page from '../form-page.module.scss'

// Where the link in the verification email lands. Better Auth verifies the
// token at /api/account/verify-email and redirects here: `?status=verified`
// on success (the callbackURL we gave it), `?error=…` when the token was bad.
export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string; error?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { status, error } = await searchParams
  const c = accountCopy[locale]
  const user = await getUser()

  const state = error ? 'failed' : status === 'verified' ? 'success' : 'pending'
  const title = { failed: c.verify.failedTitle, success: c.verify.successTitle, pending: c.verify.pendingTitle }[state]
  const body = { failed: c.verify.failedBody, success: c.verify.successBody, pending: c.verify.pendingBody }[state]

  return (
    <>
      <PageHead title={c.verify.title} locale={locale} stickers="hafa-samband" />
      <PageSection last>
        <div className={page.page}>
          <div className={styles.panel}>
            <h2>{title}</h2>
            <p>{body}</p>
            {state !== 'success' &&
              (user && !user.emailVerified ? (
                <ResendVerification
                  email={user.email}
                  callbackURL={`${localePath('/stadfesta-netfang', locale)}?status=verified`}
                  label={c.verify.resend}
                  doneLabel={c.verify.resent}
                  common={c.common}
                />
              ) : (
                !user && (
                  <p>
                    <a href={localePath('/innskraning', locale)}>{c.verify.signInToResend}</a>
                  </p>
                )
              ))}
            {state === 'success' && (
              <div className={styles.actions}>
                <ButtonLink href={dashboardPath(locale)}>{c.verify.continue}</ButtonLink>
              </div>
            )}
          </div>
        </div>
      </PageSection>
    </>
  )
}
