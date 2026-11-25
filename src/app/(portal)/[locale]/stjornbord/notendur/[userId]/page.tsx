import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUserDetail, userEventKey, type UserProject } from '@/lib/awards/admin/users'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { formatDate } from '@/lib/locale-format'
import { isLocale, localePath, type Locale } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { GrowText } from '@/components/GrowText/GrowText'
import { adminCopy } from '../../copy'
import { usersCopy } from '../copy'
import { setRoleAction } from '../actions'
import styles from '../../admin.module.scss'

/**
 * A user in the admin: their account details, whether they are an admin (with the button to
 * change it, never for one's own role), the projects they created, the projects they are on,
 * and the account's history (`user_event`).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? { title: usersCopy[locale].title } : {}
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

function Entries({ project, locale }: { project: UserProject; locale: Locale }) {
  const c = usersCopy[locale]
  const s = adminCopy[locale].status
  if (project.entries.length === 0) return <span className={styles.muted}>{c.noEntries}</span>
  return (
    <ul className={styles.entryList}>
      {project.entries.map((e) => (
        <li key={e.entryId}>
          <a href={localePath(ADMIN.entry(e.entryId), locale)}>{e.categoryName[locale]}</a>{' '}
          <span className={styles.tag} data-status={e.status}>
            {s[e.status]}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>
  searchParams: Promise<{ role?: string }>
}) {
  const { locale, userId } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath(ADMIN.user(userId), locale)
  const viewer = await requireAdmin({ locale, next: here })
  if (!UUID.test(userId)) notFound()
  const u = await getUserDetail(getAwardsDb(), userId)
  if (!u) notFound()
  const c = usersCopy[locale]
  const self = viewer.id === u.id
  const outcome = one((await searchParams).role)
  const done = outcome === 'granted' || outcome === 'removed' ? c.roleDone[outcome] : null
  const errorKey = outcome?.startsWith('error:') ? (outcome.slice(6) as keyof typeof c.roleError) : null
  const error = errorKey ? (c.roleError[errorKey] ?? null) : null
  const date = (d: Date) => formatDate(d.toISOString(), locale)
  const title = (p: UserProject) => p.title || c.untitled

  return (
    <>
      <AppHead
        title={u.name || c.noName}
        eyebrow={adminCopy[locale].eyebrow}
        crumb={{ href: localePath(ADMIN.users, locale), label: c.back }}
      />
      <div className={styles.page}>
        <section aria-labelledby="user-account" className={styles.part}>
          <h2 id="user-account" className={styles.heading}>
            {c.accountTitle}
          </h2>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>{c.email}</dt>
              <dd>{u.email}</dd>
            </div>
            <div className={styles.fact}>
              <dt>{c.phone}</dt>
              <dd>{u.phone || c.none}</dd>
            </div>
            <div className={styles.fact}>
              <dt>{c.verified}</dt>
              <dd>{u.emailVerified ? c.yes : c.no}</dd>
            </div>
            <div className={styles.fact}>
              <dt>{c.language}</dt>
              <dd>{u.preferredLocale ? (c.languages[u.preferredLocale] ?? u.preferredLocale) : c.none}</dd>
            </div>
            <div className={styles.fact}>
              <dt>{c.created}</dt>
              <dd>
                <time dateTime={u.createdAt.toISOString()}>{date(u.createdAt)}</time>
              </dd>
            </div>
          </dl>
        </section>

        <section id="role" aria-labelledby="user-role" className={styles.part} data-testid="user-role">
          <h2 id="user-role" className={styles.heading}>
            {c.roleTitle}
          </h2>
          {(done || error) && (
            <p role="status" className={styles.result} data-testid="role-result">
              {done ?? error}
            </p>
          )}
          <p className={styles.text}>
            {u.isAdmin && <span className={styles.roleTag}>{u.isSuperAdmin ? c.superAdminTag : c.adminTag}</span>}{' '}
            {u.isSuperAdmin ? c.isSuperAdmin : u.isAdmin ? c.isAdmin : c.notAdmin}
          </p>
          {u.isAdmin && self ? (
            <p className={styles.note}>{c.selfNote}</p>
          ) : u.isSuperAdmin ? (
            <p className={styles.note} data-testid="superadmin-note">
              {c.superAdminNote}
            </p>
          ) : (
            <form action={setRoleAction} className={styles.actions}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="change" value={u.isAdmin ? 'remove' : 'grant'} />
              <button
                type="submit"
                className={`btn-grow ${u.isAdmin ? styles.destructive : styles.primary}`}
                data-role-change={u.isAdmin ? 'remove' : 'grant'}
              >
                <GrowText>{u.isAdmin ? c.remove : c.grant}</GrowText>
              </button>
            </form>
          )}
        </section>

        <section aria-labelledby="user-projects" className={styles.part}>
          <h2 id="user-projects" className={styles.heading}>
            {c.projectsTitle}
          </h2>
          {u.projects.length === 0 ? (
            <p className={styles.text}>{c.projectsNone}</p>
          ) : (
            <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={c.projectsTitle}>
              <table className={styles.table} data-testid="user-projects">
                <caption className={styles.srOnly}>{c.projectsTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{c.colProject}</th>
                    <th scope="col">{c.colYear}</th>
                    <th scope="col">{c.colEntries}</th>
                  </tr>
                </thead>
                <tbody>
                  {u.projects.map((p) => (
                    <tr key={p.projectId}>
                      <th scope="row">{title(p)}</th>
                      <td>{p.year}</td>
                      <td>
                        <Entries project={p} locale={locale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="user-memberships" className={styles.part}>
          <h2 id="user-memberships" className={styles.heading}>
            {c.membershipsTitle}
          </h2>
          {u.memberships.length === 0 ? (
            <p className={styles.text}>{c.membershipsNone}</p>
          ) : (
            <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={c.membershipsTitle}>
              <table className={styles.table} data-testid="user-memberships">
                <caption className={styles.srOnly}>{c.membershipsTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{c.colProject}</th>
                    <th scope="col">{c.colKind}</th>
                    <th scope="col">{c.colEdit}</th>
                    <th scope="col">{c.colEntries}</th>
                  </tr>
                </thead>
                <tbody>
                  {u.memberships.map((m) => (
                    <tr key={m.projectId}>
                      <th scope="row">{title(m)}</th>
                      <td>
                        {c.kinds[m.kind]}
                        {m.creditRole && <span className={styles.cellNote}>{m.creditRole}</span>}
                      </td>
                      <td>
                        {m.canEdit ? c.yes : c.no}
                        {m.canEdit && !m.acceptedAt && <span className={styles.cellNote}>{c.pending}</span>}
                      </td>
                      <td>
                        <Entries project={m} locale={locale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="user-history" className={styles.part}>
          <h2 id="user-history" className={styles.heading}>
            {c.historyTitle}
          </h2>
          {u.events.length === 0 ? (
            <p className={styles.text}>{c.historyNone}</p>
          ) : (
            <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={c.historyTitle}>
              <table className={styles.table} data-testid="user-history">
                <caption className={styles.srOnly}>{c.historyTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{c.colWhen}</th>
                    <th scope="col">{c.colWho}</th>
                    <th scope="col">{c.colEvent}</th>
                  </tr>
                </thead>
                <tbody>
                  {u.events.map((e) => (
                    <tr key={e.id}>
                      <td className={styles.nowrap}>
                        <time dateTime={e.createdAt.toISOString()}>
                          {formatDate(e.createdAt.toISOString(), locale, { time: true })}
                        </time>
                      </td>
                      <td>{e.actorName ?? c.system}</td>
                      <th scope="row">{c.events[userEventKey(e.type, e.data)] ?? e.type}</th>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
