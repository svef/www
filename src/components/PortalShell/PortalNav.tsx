'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo/Logo'
import { localePath, type Locale } from '@/lib/i18n'
import type { PortalCopy } from '@/lib/portal/copy'
import { currentNavItem, otherLanguageHref, type PortalNavGroup } from '@/lib/portal/nav'
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
  // Every portal page renders per request (the layout reads the session), so this needs no
  // Suspense boundary and the server-rendered link already carries the query.
  const searchParams = useSearchParams()
  const current = currentNavItem(groups, pathname, locale)
  const accountCurrent = localePath(pathname, locale) === links.account
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Focus goes back to the menu button once the page behind is no longer inert (the effect's
  // cleanup below), not before: an inert button cannot take focus.
  const returnFocus = useRef(false)
  const close = useCallback((back: boolean) => {
    returnFocus.current = back
    setOpen(false)
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
    // Everything behind the drawer is inert while it is open: out of the tab order and of the
    // accessibility tree, so the dialog really is the only thing there.
    const button = menuButton.current
    const behind = [...document.querySelectorAll<HTMLElement>('[data-portal-behind]')]
    for (const el of behind) el.inert = true
    closeButton.current?.focus()
    const tabbables = () =>
      [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? []),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
      if (event.key !== 'Tab') return
      // Keep focus inside: past the last control it goes back to the first, and the other way.
      const list = tabbables()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      const at = document.activeElement
      const inside = !!at && !!panel.current?.contains(at)
      if (event.shiftKey && (at === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (at === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    // Grown past the drawer's width (a rotated tablet): the sidebar is simply there.
    const wide = window.matchMedia(WIDE)
    const onWide = () => wide.matches && close(false)
    document.addEventListener('keydown', onKey)
    wide.addEventListener('change', onWide)
    return () => {
      for (const el of behind) el.inert = false
      if (returnFocus.current) button?.focus()
      returnFocus.current = false
      delete root.dataset.portalDrawer
      document.removeEventListener('keydown', onKey)
      wide.removeEventListener('change', onWide)
    }
  }, [open, close])

  const languageHref = otherLanguageHref(pathname, searchParams?.toString() ?? '', locale)

  return (
    <>
      {/* A banner landmark on phones, where the sidebar is folded away behind the button. */}
      <header className={styles.topbar} data-portal-behind>
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
      </header>

      {open && (
        <div className={styles.backdrop} aria-hidden="true" onClick={() => close(true)} />
      )}

      <aside
        ref={panel}
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
              ref={closeButton}
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
                          aria-current={
                            mark === 'page'
                              ? 'page'
                              : mark === 'section'
                                ? 'true'
                                : undefined
                          }
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
    </>
  )
}
