'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/awards/auth/client'
import type { PortalCopy } from '@/lib/portal/copy'
import styles from './PortalShell.module.scss'

/**
 * The person's block at the foot of the sidebar: initials, name and email on a button that
 * opens a small menu (account, sign out). A disclosure rather than an ARIA menu: two
 * ordinary controls, reached with Tab, so nothing needs learning. Escape closes it and puts
 * focus back on the button; so does clicking or tabbing away.
 */
export function UserMenu({
  user,
  accountHref,
  accountCurrent,
  signOutTo,
  copy: c,
}: {
  user: { name: string; email: string; initials: string }
  accountHref: string
  accountCurrent: boolean
  signOutTo: string
  copy: PortalCopy
}) {
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  return (
    <div
      ref={wrap}
      className={styles.user}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          // The drawer listens for Escape too; this one is only the menu's.
          event.stopPropagation()
          event.nativeEvent.stopImmediatePropagation()
          setOpen(false)
          button.current?.focus()
        }
      }}
      onBlur={(event) => {
        if (open && !wrap.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        className={styles.userButton}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        data-user-menu
      >
        <span className={styles.avatar} aria-hidden="true">
          {user.initials}
        </span>
        <span className={styles.userText}>
          <span className="sr-only">{c.userMenu}: </span>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      <div id={panelId} className={styles.userPanel} hidden={!open}>
        <ul>
          <li>
            <Link
              href={accountHref}
              className={styles.userItem}
              aria-current={accountCurrent ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {c.account}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={styles.userItem}
              aria-disabled={leaving}
              onClick={async () => {
                if (leaving) return
                setLeaving(true)
                await authClient.signOut().catch(() => undefined)
                // The test-session cookie (e2e only) is not Better Auth's to clear.
                document.cookie = 'awards-test-user=; Max-Age=0; path=/'
                window.location.assign(signOutTo)
              }}
            >
              {leaving ? c.signingOut : c.signOut}
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
