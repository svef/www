import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { ForgotPasswordForm } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import page from '../form-page.module.scss'
import { cardMetadata } from '@/lib/og/metadata'
import { NOINDEX } from '@/lib/seo/private-pages'

// The page's own title and card, but a step in an account flow, not a page to find in
// search results (see `ACCOUNT_ROUTES`).
const card = cardMetadata('gleymt-lykilord')
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return { ...(await card(props)), robots: NOINDEX }
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const c = accountCopy[locale]

  return (
    <>
      <PageHead title={c.forgot.title} lede={c.forgot.lead} stickers="hafa-samband" locale={locale} />
      <PageSection last>
        <div className={page.page}>
          <ForgotPasswordForm
            copy={c.forgot}
            common={c.common}
            links={{
              reset: localePath('/endurstilla-lykilord', locale),
              signIn: localePath('/innskraning', locale),
            }}
          />
        </div>
      </PageSection>
    </>
  )
}
