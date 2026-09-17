'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FocusTrap } from '@mantine/core'
import { localePath, type Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

export interface HeaderNavItem {
  href: string
  label: string
}

/**
 * The width at which the nav collapses into a menu, in pixels.
 *
 * Duplicated from `$nav-breakpoint` in `Header.module.scss` because the two
 * jobs are genuinely different: CSS decides what is *shown*, this decides when
 * an open menu has stopped being a menu (see the resize effect below). Keep
 * them equal — a mismatch is only visible in the narrow band between them.
 */
const NAV_BREAKPOINT = 900

/**
 * The id `aria-controls` points at.
 *
 * The panel is in the DOM at every width — hidden with `display`, never
 * unmounted — so the reference always resolves. A conditionally rendered panel
 * would leave `aria-controls` dangling whenever the menu is closed, which is
 * exactly when a screen reader is reading the button.
 */
const PANEL_ID = 'site-menu'

/**
 * The primary navigation, and the small-screen menu that holds it.
 *
 * One set of links serves both widths. Above `NAV_BREAKPOINT` the panel is
 * `display: contents`, so the nav and the contact link are laid out by the
 * header itself exactly as the design draws them and the toggle is hidden.
 * Below it the panel becomes a block that fills the header's second row, the
 * toggle appears, and the whole thing behaves as a disclosure. Rendering the
 * links once rather than once per breakpoint is what keeps `aria-current`, the
 * link-integrity sweep and the DOM honest about how many navigations the page
 * has.
 *
 * This is the only interactive part of the header, so it is the only part that
 * is a Client Component; `Header` itself stays on the server. The language
 * toggle is passed in as `children` rather than imported here, which keeps it
 * inside the focus trap without this component knowing anything about it.
 */
export function SiteNav({
  items,
  contactHref,
  contactLabel,
  menuLabel,
  navLabel,
  locale,
  children,
}: {
  items: HeaderNavItem[]
  contactHref: string
  contactLabel: string
  /** Visible text of the toggle, and therefore its whole accessible name. */
  menuLabel: string
  navLabel: string
  locale: Locale
  /** Rendered beside the toggle; the language toggle in practice. */
  children?: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  /**
   * Close on navigation, by comparing the path against the last one rendered.
   *
   * This is React's documented way to reset state when an input changes, and
   * the reason it is not an effect is that an effect would let one frame of the
   * new page render with the menu still open. It is also not the obvious
   * shortcut of storing *which* path the menu was opened on and deriving `open`
   * from `openedAt === pathname`: that reads as stateless and tidy, and it is
   * wrong, because the path is compared and never cleared. Going Back to a page
   * the menu had been opened on would make the comparison true again and the
   * menu would reopen by itself — with the focus trap re-arming and focus
   * yanked onto the first item, on a page the reader did not ask for a menu on.
   * A boolean cannot do that.
   *
   * Focus is deliberately not pulled back to the toggle here: the reader has
   * just moved to another page and belongs at the top of it.
   */
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  /**
   * `usePathname()` returns the internally rewritten `/is/...` until a
   * client-side navigation has happened, and the visible `/...` after one —
   * see the note in `LocaleToggle`. `localePath` normalises both to the
   * visible form, which is what the hrefs are written in, so the comparison
   * holds in prerendered markup and after hydration alike.
   */
  const currentPath = localePath(pathname, locale)
  const isCurrent = (href: string) => (href || '/') === currentPath

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) toggleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    // A click anywhere outside the header dismisses the menu. Focus stays
    // where the pointer put it rather than jumping back to the toggle.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target?.closest?.('header')) close(false)
    }
    // An open menu that is still open at desktop width would be a focus trap
    // around a nav that no longer looks like a menu.
    const wide = window.matchMedia(`(min-width: ${NAV_BREAKPOINT + 1}px)`)
    const onWiden = () => {
      if (wide.matches) close(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    wide.addEventListener('change', onWiden)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      wide.removeEventListener('change', onWiden)
    }
  }, [open, close])

  return (
    <FocusTrap active={open}>
      <div className={styles.menu}>
        {/*
          Every link closes the menu on activation. The path reset above cannot
          do it alone: tapping the item for the page you are already on — the
          one carrying `aria-current` — does not change `pathname`, so without
          this the menu would sit there open having apparently done nothing.
          That link returns focus to the toggle, because the link it was on is
          about to be `display: none`; the others do not, since the reader is
          leaving the page anyway.

          The panel precedes the controls in the DOM, and sits below them on
          screen. That is not a focus-order problem: closed, it is
          `display: none` and out of the tab ring entirely; open, focus is
          moved into it explicitly, so tabbing runs through the menu and ends
          on the toggle that closes it.
        */}
        <div id={PANEL_ID} className={styles.panel} data-open={open ? 'true' : undefined}>
          <nav aria-label={navLabel} className={styles.nav}>
            <ul className={styles.list}>
              {items.map((item, index) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.navLink}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    data-autofocus={index === 0 ? true : undefined}
                    onClick={() => close(isCurrent(item.href))}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href={contactHref}
            className={styles.contactLink}
            aria-current={isCurrent(contactHref) ? 'page' : undefined}
            onClick={() => close(isCurrent(contactHref))}
          >
            {contactLabel}
          </Link>
        </div>
        <div className={styles.controls}>
          {children}
          <button
            type="button"
            ref={toggleRef}
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={PANEL_ID}
            onClick={() => (open ? close(false) : setOpen(true))}
          >
            <span className={styles.bars} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {menuLabel}
          </button>
        </div>
      </div>
    </FocusTrap>
  )
}
