import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listUsers, parseUserSearch, USER_ROLE_FILTERS, type UserSortKey } from '@/lib/awards/admin/users'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { formatDate } from '@/lib/locale-format'
import { isLocale, localePath } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { inputClass } from '@/components/FormParts/FormParts'
import { GrowText } from '@/components/GrowText/GrowText'
import { adminCopy } from '../copy'
import { Pager } from '../Pager'
import { usersCopy } from './copy'
import styles from '../admin.module.scss'

/**
 * Stjórnborð → Notendur: every account, searched on name and email, filtered to admins,
 * sorted and paged in the database; all of it in the query string. A row opens the user.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: usersCopy[locale].title }
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath(ADMIN.users, locale)
  await requireAdmin({ locale, next: here })
  const c = usersCopy[locale]
  const list = parseUserSearch(await searchParams)
  const result = await listUsers(getAwardsDb(), list)

  const listHref = (over: { sort?: UserSortKey; dir?: 'asc' | 'desc'; page?: number }) => {
    const qs = new URLSearchParams()
    if (list.q) qs.set('q', list.q)
    if (list.role !== 'all') qs.set('role', list.role)
    qs.set('sort', over.sort ?? list.sort)
    qs.set('dir', over.dir ?? list.dir)
    qs.set('page', String(over.page ?? result.page))
    return `${here}?${qs}`
  }
  const sortHeader = (key: UserSortKey, label: string) => {
    const active = list.sort === key
    return (
      <th scope="col" aria-sort={active ? (list.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <a
          className={styles.sortLink}
          href={listHref({ sort: key, dir: active && list.dir === 'asc' ? 'desc' : 'asc', page: 1 })}
        >
          {label}
          <span className={styles.srOnly}>, {c.sortBy(label)}</span>
        </a>
      </th>
    )
  }
  const from = (result.page - 1) * result.pageSize + 1

  return (
    <>
      <AppHead title={c.title} eyebrow={adminCopy[locale].eyebrow} lede={c.lede} />
      <div className={styles.page}>
        <section aria-label={c.caption} className={styles.listSection}>
          <form method="get" action={here} className={styles.filter} role="search" aria-label={c.filtersLabel}>
            <input type="hidden" name="sort" value={list.sort} />
            <input type="hidden" name="dir" value={list.dir} />
            <div className={`${styles.field} ${styles.searchField}`}>
              <label htmlFor="users-search">{c.search}</label>
              <input
                id="users-search"
                type="search"
                name="q"
                defaultValue={list.q}
                maxLength={100}
                className={inputClass}
                aria-describedby="users-search-hint"
              />
              <small id="users-search-hint" className={styles.hint}>
                {c.searchHint}
              </small>
            </div>
            <label className={styles.field}>
              <span>{c.role}</span>
              <select name="role" defaultValue={list.role} className={inputClass}>
                {USER_ROLE_FILTERS.map((r) => (
                  <option key={r} value={r}>
                    {c.roles[r]}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="submit" className={`btn-grow ${styles.secondary}`}>
                <GrowText>{c.filter}</GrowText>
              </button>
              {(list.q || list.role !== 'all') && (
                <a className={styles.quiet} href={here}>
                  {c.reset}
                </a>
              )}
            </div>
          </form>

          <p className={styles.summary} role="status" data-testid="users-summary">
            {c.summary(from, from + result.rows.length - 1, result.total)}
          </p>

          {result.rows.length === 0 ? (
            <p className={styles.text}>{c.empty}</p>
          ) : (
            <div className={styles.tableWrap} role="region" tabIndex={0} aria-label={c.tableRegion}>
              <table className={styles.table} data-testid="users-table">
                <caption className={styles.srOnly}>{c.caption}</caption>
                <thead>
                  <tr>
                    {sortHeader('name', c.colName)}
                    {sortHeader('email', c.colEmail)}
                    {sortHeader('projects', c.colProjects)}
                    {sortHeader('created', c.colCreated)}
                    <th scope="col">{c.colRole}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((u) => (
                    <tr key={u.id} data-user={u.id}>
                      <th scope="row">
                        <a href={localePath(ADMIN.user(u.id), locale)}>{u.name || c.noName}</a>
                      </th>
                      <td className={styles.wrap}>
                        {u.email}
                        {!u.emailVerified && <span className={styles.cellNote}>{c.unverified}</span>}
                      </td>
                      <td className={styles.num}>{u.projects}</td>
                      <td className={styles.nowrap}>
                        <time dateTime={u.createdAt.toISOString()}>{formatDate(u.createdAt.toISOString(), locale)}</time>
                      </td>
                      <td>{u.isAdmin && <span className={styles.roleTag}>{c.adminTag}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pager locale={locale} page={result.page} pageCount={result.pageCount} href={(page) => listHref({ page })} />
        </section>
      </div>
    </>
  )
}
