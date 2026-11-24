import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/Button/Button'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { signInPath } from '@/lib/awards/auth/roles'
import { getAwardsDb } from '@/lib/awards/db/client'
import { user as userTable } from '@/lib/awards/db/schema'
import { previewInvitation } from '@/lib/awards/invitations/service'
import { normalizeEmail } from '@/lib/awards/invitations/token'
import { getRole } from '@/lib/awards/projects/service'
import { getCurrentUserId, getRequestNow, NotSignedInError } from '@/lib/awards/session'
import { isLocale, localePath } from '@/lib/i18n'
import { eq } from 'drizzle-orm'
import { acceptInvitationAction } from './actions'
import { inviteCopy } from './copy'
import styles from './invite.module.scss'

/**
 * Accepting an invitation to edit a project (`/is/innsendingar/bod/<token>` ·
 * `/en/submissions/invite/<token>`, svef/www#165). The link only ever *shows* the
 * invitation (a mail scanner or a prefetch must not use it up); accepting is a button, a
 * POST. Per request, never indexed, and the token never leaves the path.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { locale, token } = await params
  if (!isLocale(locale)) notFound()
  const c = inviteCopy[locale]
  const db = getAwardsDb()
  const now = await getRequestNow()
  const here = localePath(`/innsendingar/bod/${token}`, locale)

  const preview = await previewInvitation(db, token, now)

  let userId: string | null = null
  try {
    userId = await getCurrentUserId()
  } catch (e) {
    if (!(e instanceof NotSignedInError)) throw e
  }

  const head = <PageHead title={c.title} lede={c.lede} locale={locale} />

  if (preview.status !== 'valid') {
    const p = c.problems[preview.status]
    return (
      <>
        {head}
        <PageSection last aria-label={c.title}>
          <div className={styles.panel} role="status">
            <h2>{p.title}</h2>
            <p>{p.body}</p>
            <div className={styles.actions}>
              <ButtonLink href={userId ? localePath('/innsendingar/minar', locale) : signInPath(locale, here)}>
                {userId ? c.mine : c.signIn}
              </ButtonLink>
            </div>
          </div>
        </PageSection>
      </>
    )
  }

  // Someone who can already open the project has nothing to accept.
  if (userId && (await getRole(db, userId, preview.projectId)))
    redirect(localePath(`/innsendingar/${preview.projectId}`, locale))

  const title = preview.projectTitle.trim() || c.untitled
  const intro = (
    <>
      <p>
        <span className={styles.title}>{c.invitedBy(preview.inviterName, title)}</span>
      </p>
      <p>{c.meaning}</p>
    </>
  )

  if (!userId) {
    const signUp = `${localePath('/nyskraning', locale)}?next=${encodeURIComponent(here)}&email=${encodeURIComponent(preview.email)}`
    return (
      <>
        {head}
        <PageSection last aria-label={c.title}>
          <div className={styles.panel}>
            {intro}
            <p>{c.needAccount(preview.email)}</p>
            <div className={styles.actions}>
              <ButtonLink href={signUp}>{c.signUp}</ButtonLink>
              <ButtonLink href={signInPath(locale, here)} variant="text">
                {c.signIn}
              </ButtonLink>
            </div>
          </div>
        </PageSection>
      </>
    )
  }

  const [account] = await db
    .select({ email: userTable.email, emailVerified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.id, userId))
  const email = account?.email ?? ''
  const mismatch = normalizeEmail(email) !== normalizeEmail(preview.email)

  return (
    <>
      {head}
      <PageSection last aria-label={c.title}>
        <div className={styles.panel}>
          {intro}
          {mismatch ? (
            <>
              <h2>{c.mismatchTitle}</h2>
              <p>{c.mismatch(preview.email, email)}</p>
              {account?.emailVerified ? (
                <form action={acceptInvitationAction} className={styles.actions}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="confirm" value="1" />
                  <Button type="submit">{c.acceptHere}</Button>
                  <ButtonLink href={signInPath(locale, here)} variant="text">
                    {c.otherAccount}
                  </ButtonLink>
                </form>
              ) : (
                <>
                  <p className={styles.notice}>{c.unverified(email)}</p>
                  <div className={styles.actions}>
                    <ButtonLink href={signInPath(locale, here)}>{c.otherAccount}</ButtonLink>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p>{c.acceptHint(email)}</p>
              <form action={acceptInvitationAction} className={styles.actions}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="token" value={token} />
                <Button type="submit">{c.accept}</Button>
              </form>
            </>
          )}
        </div>
      </PageSection>
    </>
  )
}
