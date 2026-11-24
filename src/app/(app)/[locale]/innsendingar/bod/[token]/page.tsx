import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { GrowText } from '@/components/GrowText/GrowText'
import { AppHead } from '@/components/AppHead/AppHead'
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

  const head = <AppHead title={c.title} eyebrow={c.lede} />

  if (preview.status !== 'valid') {
    const p = c.problems[preview.status]
    return (
      <>
        {head}
        <PageSection last aria-label={c.title} className={styles.section}>
          <div className={styles.invite}>
            <div className={`${styles.notice} ${styles.attention}`} role="status">
              <h2>{p.title}</h2>
              <p>{p.body}</p>
            </div>
            <div className={styles.actions}>
              <Link
                href={
                  userId
                    ? localePath('/innsendingar/minar', locale)
                    : signInPath(locale, here)
                }
                className={`btn-grow ${styles.primary}`}
              >
                <GrowText>{userId ? c.mine : c.signIn}</GrowText>
              </Link>
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
    <div className={styles.intro}>
      <p className={styles.invitedBy}>{c.invitedBy(preview.inviterName, title)}</p>
      <p className={styles.meaning}>{c.meaning}</p>
    </div>
  )
  const submit = (label: string) => (
    <button type="submit" className={`btn-grow ${styles.primary}`}>
      <GrowText>{label}</GrowText>
    </button>
  )

  if (!userId) {
    const signUp = `${localePath('/nyskraning', locale)}?next=${encodeURIComponent(here)}&email=${encodeURIComponent(preview.email)}`
    return (
      <>
        {head}
        <PageSection last aria-label={c.title} className={styles.section}>
          <div className={styles.invite}>
            {intro}
            <div className={styles.step}>
              <p>{c.needAccount(preview.email)}</p>
              <div className={styles.actions}>
                <Link href={signUp} className={`btn-grow ${styles.primary}`}>
                  <GrowText>{c.signUp}</GrowText>
                </Link>
                <Link
                  href={signInPath(locale, here)}
                  className={`btn-grow ${styles.secondary}`}
                >
                  <GrowText>{c.signIn}</GrowText>
                </Link>
              </div>
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
      <PageSection last aria-label={c.title} className={styles.section}>
        <div className={styles.invite}>
          {intro}
          {mismatch ? (
            <div className={styles.step}>
              <div className={`${styles.notice} ${styles.attention}`}>
                <h2>{c.mismatchTitle}</h2>
                <p>{c.mismatch(preview.email, email)}</p>
                {!account?.emailVerified && <p>{c.unverified(email)}</p>}
              </div>
              {account?.emailVerified ? (
                <form action={acceptInvitationAction} className={styles.actions}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="confirm" value="1" />
                  {submit(c.acceptHere)}
                  <Link
                    href={signInPath(locale, here)}
                    className={`btn-grow ${styles.secondary}`}
                  >
                    <GrowText>{c.otherAccount}</GrowText>
                  </Link>
                </form>
              ) : (
                <div className={styles.actions}>
                  <Link
                    href={signInPath(locale, here)}
                    className={`btn-grow ${styles.primary}`}
                  >
                    <GrowText>{c.otherAccount}</GrowText>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.step}>
              <p>{c.acceptHint(email)}</p>
              <form action={acceptInvitationAction} className={styles.actions}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="token" value={token} />
                {submit(c.accept)}
              </form>
            </div>
          )}
        </div>
      </PageSection>
    </>
  )
}
