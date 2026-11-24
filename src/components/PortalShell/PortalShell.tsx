import type { ReactNode } from 'react'
import { getDictionary, type Locale } from '@/lib/i18n'
import { buildPortalNav, initialsOf } from '@/lib/portal/nav'
import { portalCopy } from '@/lib/portal/copy'
import { PORTAL } from '@/lib/portal/paths'
import { localePath } from '@/lib/i18n'
import { signInPath } from '@/lib/awards/auth/roles'
import { PortalNav } from './PortalNav'
import styles from './PortalShell.module.scss'

export type ShellViewer = { name: string; email: string; isAdmin: boolean }

/**
 * The signed-in app's frame, for the portal (Mínar síður) and the admin (Stjórnborð) alike:
 * a sidebar on wide screens with the mark, the navigation groups and the person's avatar
 * menu at the foot; on narrow ones a compact top bar whose menu button opens the same
 * sidebar as a modal drawer. It replaces the site's header and footer, as a dashboard does.
 *
 * Signed out (an invitation link opened before signing in) the frame is bare: the mark,
 * the language and a way to sign in, and no navigation, since none of it would open.
 */
export function PortalShell({
  locale,
  viewer,
  children,
}: {
  locale: Locale
  viewer: ShellViewer | null
  children: ReactNode
}) {
  const c = portalCopy[locale]
  const t = getDictionary(locale)
  return (
    <div className={styles.shell} data-portal-shell>
      <a href="#main" className="skip-link" data-portal-behind>
        {t.skipToContent}
      </a>
      <PortalNav
        locale={locale}
        groups={viewer ? buildPortalNav(locale, viewer.isAdmin) : []}
        user={
          viewer
            ? {
                name: viewer.name,
                email: viewer.email,
                initials: initialsOf(viewer.name, viewer.email),
              }
            : null
        }
        links={{
          home: `/${locale}`,
          account: localePath(PORTAL.account, locale),
          signIn: signInPath(locale),
        }}
        copy={c}
      />
      <main id="main" tabIndex={-1} className={styles.main} data-portal-behind>
        {children}
      </main>
    </div>
  )
}
