import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { ResetPasswordForm } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import styles from '@/components/AccountForms/AccountForms.module.scss'
import page from '../form-page.module.scss'
import { cardMetadata } from '@/lib/og/metadata'

export const generateMetadata = cardMetadata('endurstilla-lykilord')

// Where the link in the password-reset email lands: `?token=…` when the token
// was valid, `?error=INVALID_TOKEN` when Better Auth rejected it.
export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { token } = await searchParams
  const c = accountCopy[locale]

  return (
    <>
      <PageHead title={c.reset.title} lede={c.reset.lead} stickers="hafa-samband" locale={locale} />
      <PageSection last>
        <div className={page.page}>
          {token ? (
            <ResetPasswordForm
              token={token}
              copy={c.reset}
              common={c.common}
              links={{ signIn: localePath('/innskraning', locale) }}
            />
          ) : (
            <div className={styles.panel}>
              <h2>{c.reset.invalidTitle}</h2>
              <p>{c.reset.invalidBody}</p>
              <div className={styles.actions}>
                <ButtonLink href={localePath('/gleymt-lykilord', locale)}>{c.reset.requestNew}</ButtonLink>
              </div>
            </div>
          )}
        </div>
      </PageSection>
    </>
  )
}
