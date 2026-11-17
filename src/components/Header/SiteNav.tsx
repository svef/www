'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FocusTrap } from '@mantine/core'
import { GrowText } from '@/components/GrowText/GrowText'
import { isHiddenPath, localePath, withoutHiddenLinks, type Locale } from '@/lib/i18n'
import styles from './Header.module.scss'

export interface HeaderNavItem {
  href: string
  label: string
  /**
   * Pages that live under this one. The parent stays a real link to its own
   * page — it is not a label standing in for a menu — and the disclosure is a
   * separate button beside it, so the page remains reachable by keyboard
   * without opening anything.
   */
  children?: { href: string; label: string }[]
}

/**
 * The width at which the nav collapses into a menu, in pixels.
 *
 * Duplicated from `bp.$md` in `breakpoints.scss`, which `Header.module.scss` uses, because the two
 * jobs are genuinely different: CSS decides what is *shown*, this decides when
 * an open menu has stopped being a menu (see the resize effect below). Keep
 * them equal — a mismatch is only visible in the narrow band between them.
 */
const NAV_BREAKPOINT = 920

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
 * `display: contents`, so the nav is laid out by the
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
function SiteNavMenu({
  items,
  menuLabel,
  closeLabel,
  navLabel,
  submenuLabel,
  email,
  locale,
  children,
}: {
  items: HeaderNavItem[]
  /** Appended to a section's name on its disclosure button, e.g. "Um SVEF — undirsíður". */
  submenuLabel: string
  /** Visible text of the toggle, and therefore its whole accessible name. */
  menuLabel: string
  /**
   * The toggle's text while the menu is open (`Loka`). Optional so the label can
   * stay put where there is no word for it; with it, the visible text and the
   * accessible name change together, which is what keeps WCAG 2.5.3 satisfied.
   */
  closeLabel?: string
  navLabel: string
  /** Shown in the foot of the small-screen menu, beside the language toggle. */
  email?: string
  locale: Locale
  /** Rendered in the foot of the menu; the language toggle in practice. */
  children?: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  /** `href` of the parent whose submenu is open, or `null`. One at a time. */
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const submenuTriggers = useRef(new Map<string, HTMLButtonElement | null>())
  /**
   * Closing on hover-out is delayed a little. The gap between a trigger and its
   * panel is bridged in CSS, but a pointer moving diagonally still clips the
   * edge of a neighbour on the way, and closing on that is the thing that makes
   * a menu feel like it is running away from you.
   */
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])
  useEffect(() => cancelClose, [cancelClose])
  /**
   * Whether opening on hover makes sense at all. False on a touch screen, where
   * `mouseenter` fires on a tap and would race the button's own click.
   */
  const [hoverCapable, setHoverCapable] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setHoverCapable(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // Escape closes the submenu first and the menu second, so one press does not
  // dismiss more than the reader asked it to. Focus goes back to the button
  // that opened it, which is where the reader was.
  useEffect(() => {
    if (!openSubmenu) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      const trigger = submenuTriggers.current.get(openSubmenu)
      setOpenSubmenu(null)
      trigger?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target?.closest?.('[data-submenu-root]')) setOpenSubmenu(null)
    }
    document.addEventListener('keydown', onKeyDown, { capture: true })
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown, { capture: true })
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openSubmenu])

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
  /** A parent whose submenu holds the current page is marked, but not as `aria-current`. */
  const holdsCurrent = (item: HeaderNavItem) =>
    item.children?.some((child) => isCurrent(child.href)) ?? false

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    setOpenSubmenu(null)
    if (returnFocus) {
      toggleRef.current?.focus()
      // The focus trap moves focus to the first link a beat after it activates. If
      // Escape lands before that beat, the trap would take focus back off the toggle
      // and onto a link that is about to be hidden, leaving it on `body`. Settling
      // it once more after that has happened keeps focus where the reader was.
      window.setTimeout(() => {
        const toggle = toggleRef.current
        if (toggle && document.activeElement !== toggle) toggle.focus()
      }, 60)
    }
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
              {items.map((item, index) => {
                const submenuId = `${PANEL_ID}-${item.href.replace(/[^a-z0-9]+/gi, '-')}`
                const expanded = openSubmenu === item.href
                return (
                  <li
                    key={item.href}
                    className={item.children ? styles.hasSubmenu : undefined}
                    data-submenu-root={item.children ? '' : undefined}
                    // Pointer-only: `onMouseEnter` fires on a tap too, which
                    // would fight the button's own click. `hoverCapable` is
                    // false on a touch screen, so there the button is the only
                    // way in — which is the behaviour you want anyway.
                    onMouseEnter={
                      item.children && hoverCapable
                        ? () => {
                            cancelClose()
                            setOpenSubmenu(item.href)
                          }
                        : undefined
                    }
                    onMouseLeave={
                      item.children && hoverCapable
                        ? () => {
                            cancelClose()
                            closeTimer.current = setTimeout(() => setOpenSubmenu(null), 160)
                          }
                        : undefined
                    }
                  >
                    <Link
                      href={item.href}
                      className={styles.navLink}
                      aria-current={isCurrent(item.href) ? 'page' : undefined}
                      data-holds-current={holdsCurrent(item) ? 'true' : undefined}
                      data-autofocus={index === 0 ? true : undefined}
                      onClick={() => close(isCurrent(item.href))}
                    >
                      <GrowText className={styles.label}>{item.label}</GrowText>
                    </Link>

                    {item.children && (
                      <>
                        <button
                          type="button"
                          ref={(el) => {
                            submenuTriggers.current.set(item.href, el)
                          }}
                          className={styles.submenuToggle}
                          aria-expanded={expanded}
                          aria-controls={submenuId}
                          // The link beside it already carries the page's name,
                          // so naming this after the section would have a screen
                          // reader read the same words twice in a row.
                          aria-label={`${item.label} — ${submenuLabel}`}
                          onClick={() => setOpenSubmenu(expanded ? null : item.href)}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                              event.preventDefault()
                              setOpenSubmenu(item.href)
                            }
                          }}
                        >
                          <span className={styles.chevron} aria-hidden="true" />
                        </button>

                        <ul
                          id={submenuId}
                          className={styles.submenu}
                          data-open={expanded ? 'true' : undefined}
                        >
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={styles.submenuLink}
                                aria-current={isCurrent(child.href) ? 'page' : undefined}
                                onClick={() => close(isCurrent(child.href))}
                              >
                                <GrowText className={styles.subLabel}>{child.label}</GrowText>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
          {/*
            The foot of the menu. At desktop width it is `display: contents`, so
            the language toggle is simply the last thing in the header's row; on a
            phone it is the violet block at the bottom of the open menu, holding
            the address and the toggle.
          */}
          <div className={styles.navFoot}>
            {email && (
              <p className={styles.navMail}>
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            )}
            {children}
          </div>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            ref={toggleRef}
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={PANEL_ID}
            onClick={() => (open ? close(false) : setOpen(true))}
          >
            <span className={styles.brg} aria-hidden="true">
              <i />
              <i />
            </span>
            {open && closeLabel ? closeLabel : menuLabel}
          </button>
        </div>
      </div>
    </FocusTrap>
  )
}

/**
 * Drops hidden pages (see `HIDDEN_PAGES`) before anything is rendered, so
 * nothing that feeds the nav can put one back. A hidden parent takes its
 * submenu with it. Kept as a wrapper rather than inline in the component, which
 * the React Compiler's memoization check does not accept.
 */
export function SiteNav(props: Parameters<typeof SiteNavMenu>[0]) {
  const items = props.items
    .filter((item) => !isHiddenPath(item.href))
    .map((item) =>
      item.children ? { ...item, children: withoutHiddenLinks(item.children) } : item,
    )
  return <SiteNavMenu {...props} items={items} />
}
