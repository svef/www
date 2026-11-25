import type { Metadata } from 'next'
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
import { NOINDEX } from '@/lib/seo/private-pages'

// The page's own title and card, but a step in an account flow, not a page to find in
// search results (see `ACCOUNT_ROUTES`).
const card = cardMetadata('endurstilla-lykilord')
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return { ...(await card(props)), robots: NOINDEX }
}

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
