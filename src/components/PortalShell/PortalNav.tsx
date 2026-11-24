'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FocusTrap } from '@mantine/core'
import { Logo } from '@/components/Logo/Logo'
import { localePath, type Locale } from '@/lib/i18n'
import type { PortalCopy } from '@/lib/portal/copy'
import { currentNavItem, type PortalNavGroup } from '@/lib/portal/nav'
import { UserMenu } from './UserMenu'
import styles from './PortalShell.module.scss'

/** Wide enough for the sidebar; below it the sidebar is a drawer. Matches `bp.$md`. */
const WIDE = '(min-width: 921px)'

/**
 * The sidebar, and on narrow screens the top bar and the drawer it opens. One `<aside>`
 * serves both: always shown beside the page when there is room, and otherwise hidden until
 * the menu button opens it as a modal dialog (focus kept inside, Escape or the close button
 * shut it, focus goes back to the menu button, the page behind does not scroll). Following
 * a link closes it.
 */
export function PortalNav({
  locale,
  groups,
  user,
  links,
  copy: c,
}: {
  locale: Locale
  groups: PortalNavGroup[]
  user: { name: string; email: string; initials: string } | null
  links: { home: string; account: string; signIn: string }
  copy: PortalCopy
}) {
  const pathname = usePathname() ?? ''
  const current = currentNavItem(groups, pathname, locale)
  const accountCurrent = localePath(pathname, locale) === links.account
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) menuButton.current?.focus()
  }, [])

  // A followed link closes the drawer: the page it opens is what the reader asked for.
  const [shownFor, setShownFor] = useState(pathname)
  if (shownFor !== pathname) {
    setShownFor(pathname)
    if (open) setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.dataset.portalDrawer = 'open'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    // Grown past the drawer's width (a rotated tablet): the sidebar is simply there.
    const wide = window.matchMedia(WIDE)
    const onWide = () => wide.matches && close(false)
    document.addEventListener('keydown', onKey)
    wide.addEventListener('change', onWide)
    return () => {
      delete root.dataset.portalDrawer
      document.removeEventListener('keydown', onKey)
      wide.removeEventListener('change', onWide)
    }
  }, [open, close])

  const languageHref = localePath(pathname, locale === 'is' ? 'en' : 'is')

  return (
    <>
      <div className={styles.topbar}>
        <Link href={links.home} className={styles.topMark} aria-label={c.home}>
          <Logo size="48px" cycle={false} />
        </Link>
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          data-portal-menu
        >
          <span className={styles.burger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>{c.menu}</span>
        </button>
      </div>

      {open && <div className={styles.backdrop} aria-hidden="true" onClick={() => close(true)} />}

      <FocusTrap active={open}>
        <aside
          id={panelId}
          className={clsx(styles.sidebar, open && styles.open)}
          {...(open ? { role: 'dialog', 'aria-modal': true, 'aria-label': c.menu } : {})}
          data-portal-sidebar
        >
          <div className={styles.sideHead}>
            <Link href={links.home} className={styles.sideMark} aria-label={c.home}>
              <Logo size="64px" cycle={false} hoverColours />
            </Link>
            {open && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => close(true)}
                data-portal-close
              >
                {c.closeMenu}
              </button>
            )}
          </div>

          {groups.length > 0 && (
            <nav aria-label={c.navLabel} className={styles.nav}>
              {groups.map((g) => (
                <div key={g.id} className={styles.group} data-nav-group={g.id}>
                  <p id={`${panelId}-${g.id}`} className={styles.groupLabel}>
                    {g.label}
                  </p>
                  <ul aria-labelledby={`${panelId}-${g.id}`} className={styles.links}>
                    {g.items.map((item) => {
                      const mark = current?.href === item.href ? current.kind : null
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={styles.link}
                            aria-current={mark === 'page' ? 'page' : mark === 'section' ? 'true' : undefined}
                          >
                            {item.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          )}

          <div className={styles.sideFoot}>
            <Link
              href={languageHref}
              hrefLang={locale === 'is' ? 'en' : 'is'}
              lang={locale === 'is' ? 'en' : 'is'}
              className={styles.language}
            >
              {c.language}
            </Link>
            {user ? (
              <UserMenu
                user={user}
                accountHref={links.account}
                accountCurrent={accountCurrent}
                signOutTo={links.signIn}
                copy={c}
              />
            ) : (
              <Link href={links.signIn} className={styles.signIn}>
                {c.signIn}
              </Link>
            )}
          </div>
        </aside>
      </FocusTrap>
    </>
  )
}
