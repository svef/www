import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireViewer } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { user } from '@/lib/awards/db/schema'
import { signInPath } from '@/lib/awards/auth/roles'
import { isLocale, localePath } from '@/lib/i18n'
import { PORTAL } from '@/lib/portal/paths'
import { portalCopy } from '@/lib/portal/copy'
import { AppHead } from '@/components/AppHead/AppHead'
import { eq } from 'drizzle-orm'
import { accountSettingsCopy } from './copy'
import { PasswordForm, ProfileForm, SignOutButton } from './AccountSettings'
import styles from './account.module.scss'

/**
 * Mínar síður → Aðgangur, opened from the avatar menu: name, phone and email language,
 * the email shown but not editable, the password, and signing out.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: accountSettingsCopy[locale].title }
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const viewer = await requireViewer({ locale, next: localePath(PORTAL.account, locale) })
  const c = accountSettingsCopy[locale]
  const [row] = await getAwardsDb()
    .select({ preferredLocale: user.preferredLocale })
    .from(user)
    .where(eq(user.id, viewer.id))
  const preferred = row?.preferredLocale === 'en' ? 'en' : row?.preferredLocale === 'is' ? 'is' : locale

  return (
    <>
      <AppHead title={c.title} eyebrow={portalCopy[locale].name} lede={c.lede} />
      <div className={styles.page}>
        <section aria-labelledby="account-profile" className={styles.part}>
          <h2 id="account-profile" className={styles.heading}>
            {c.profileTitle}
          </h2>
          <ProfileForm
            copy={c}
            initial={{ name: viewer.name, phone: viewer.phone ?? '', preferredLocale: preferred }}
          />
        </section>

        <section aria-labelledby="account-email" className={styles.part}>
          <h2 id="account-email" className={styles.heading}>
            {c.emailTitle}
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>{c.email}</dt>
              <dd data-testid="account-email">
                {viewer.email}{' '}
                <span className={styles.tag} data-verified={viewer.emailVerified}>
                  {viewer.emailVerified ? c.verified : c.unverified}
                </span>
              </dd>
            </div>
          </dl>
          <p className={styles.note}>{c.emailNote}</p>
        </section>

        <section aria-labelledby="account-password" className={styles.part}>
          <h2 id="account-password" className={styles.heading}>
            {c.passwordTitle}
          </h2>
          <PasswordForm copy={c} />
        </section>

        <section aria-labelledby="account-signout" className={styles.part}>
          <h2 id="account-signout" className={styles.heading}>
            {c.signOutTitle}
          </h2>
          <p className={styles.note}>{c.signOutLead}</p>
          <SignOutButton copy={c} to={signInPath(locale)} />
        </section>
      </div>
    </>
  )
}
