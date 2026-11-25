import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { SignInForm, SignedInPanel } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import { dashboardPath, safeNext } from '@/lib/awards/auth/roles'
import { getUser } from '@/lib/awards/auth/session'
import page from '../form-page.module.scss'
import { cardMetadata } from '@/lib/og/metadata'
import { NOINDEX } from '@/lib/seo/private-pages'

// The page's own title and card, but a step in an account flow, not a page to find in
// search results (see `ACCOUNT_ROUTES`).
const card = cardMetadata('innskraning')
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return { ...(await card(props)), robots: NOINDEX }
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { next } = await searchParams
  const c = accountCopy[locale]
  const target = safeNext(next, dashboardPath(locale))
  const user = await getUser()
  const nextQuery = next ? `?next=${encodeURIComponent(target)}` : ''

  return (
    <>
      <PageHead title={c.signIn.title} lede={c.signIn.lead} stickers="hafa-samband" locale={locale} />
      <PageSection last>
        <div className={page.page}>
          {user ? (
            <SignedInPanel
                name={user.name}
                email={user.email}
                emailVerified={user.emailVerified}
                copy={c.signedIn}
                common={c.common}
                links={{
                  dashboard: target,
                  verified: `${localePath('/stadfesta-netfang', locale)}?status=verified`,
                }}
                signOutTo={localePath('/innskraning', locale)}
              />
          ) : (
            <SignInForm
              copy={c.signIn}
              common={c.common}
              next={target}
              links={{
                forgot: localePath('/gleymt-lykilord', locale),
                signUp: `${localePath('/nyskraning', locale)}${nextQuery}`,
              }}
            />
          )}
        </div>
      </PageSection>
    </>
  )
}
