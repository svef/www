import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { ForgotPasswordForm } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import page from '../form-page.module.scss'
import { cardMetadata } from '@/lib/og/metadata'

export const generateMetadata = cardMetadata('gleymt-lykilord')

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
