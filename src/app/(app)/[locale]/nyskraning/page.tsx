import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { SignUpForm } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import { dashboardPath, safeNext } from '@/lib/awards/auth/roles'
import page from '../form-page.module.scss'
import { cardMetadata } from '@/lib/og/metadata'
import { NOINDEX } from '@/lib/seo/private-pages'

// The page's own title and card, but a step in an account flow, not a page to find in
// search results (see `ACCOUNT_ROUTES`).
const card = cardMetadata('nyskraning')
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return { ...(await card(props)), robots: NOINDEX }
}

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string; email?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { next, email } = await searchParams
  const defaultEmail = email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined
  const c = accountCopy[locale]
  const target = safeNext(next, dashboardPath(locale))

  return (
    <>
      <PageHead title={c.signUp.title} lede={c.signUp.lead} stickers="hafa-samband" locale={locale} />
      <PageSection last>
        <div className={page.page}>
          <SignUpForm
            locale={locale}
            copy={c.signUp}
            common={c.common}
            next={target}
            defaultEmail={defaultEmail}
            links={{
              signIn: `${localePath('/innskraning', locale)}${next ? `?next=${encodeURIComponent(target)}` : ''}`,
              verified: `${localePath('/stadfesta-netfang', locale)}?status=verified`,
            }}
          />
        </div>
      </PageSection>
    </>
  )
}
