'use client'

import { useId, useState } from 'react'
import { LinkSimple } from '@phosphor-icons/react/dist/ssr'
import styles from './ShareRow.module.scss'

export interface ShareRowLabels {
  /** Visible label for the row, e.g. "Deila". */
  label: string
  facebook: string
  x: string
  linkedin: string
  copyLink: string
  copied: string
}

export interface ShareRowProps {
  /** Absolute URL of the page being shared. */
  url: string
  /** Title of the page being shared, used as the suggested post text. */
  title: string
  labels: ShareRowLabels
}

/**
 * "Deila" row at the foot of an article: the three networks the association
 * actually posts to, plus copy-link for everywhere else.
 *
 * The three networks are ordinary links — they navigate, so a link is what they
 * are, and they work without JavaScript. Copy-link is a button because it acts
 * on the page rather than going anywhere, and it confirms in a live region so
 * the result is announced instead of only flashing on screen.
 */
export function ShareRow({ url, title, labels }: ShareRowProps) {
  const labelId = useId()
  const [copied, setCopied] = useState(false)

  const targets = [
    {
      key: 'facebook',
      short: 'FB',
      label: labels.facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: 'x',
      short: 'X',
      label: labels.x,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      key: 'linkedin',
      short: 'LI',
      label: labels.linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // The URL is in the address bar either way, so there is nothing to report.
      setCopied(false)
    }
  }

  return (
    <div className={styles.row} role="group" aria-labelledby={labelId}>
      <span className={styles.label} id={labelId}>
        {labels.label}
      </span>
      {targets.map((target) => (
        <a
          key={target.key}
          className={styles.target}
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={target.label}
        >
          <span aria-hidden="true">{target.short}</span>
        </a>
      ))}
      <button
        type="button"
        className={styles.target}
        onClick={copyLink}
        aria-label={labels.copyLink}
      >
        <LinkSimple size={16} weight="bold" aria-hidden="true" />
      </button>
      <span className={styles.status} role="status">
        {copied ? labels.copied : ''}
      </span>
    </div>
  )
}
