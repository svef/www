import { notFound } from 'next/navigation'
import { isLocale, localePath } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { SignInForm, SignedInPanel } from '@/components/AccountForms/AccountForms'
import { accountCopy } from '@/components/AccountForms/copy'
import { dashboardPath, safeNext } from '@/lib/awards/auth/roles'
import { getUser } from '@/lib/awards/auth/session'
import page from '../form-page.module.scss'

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
