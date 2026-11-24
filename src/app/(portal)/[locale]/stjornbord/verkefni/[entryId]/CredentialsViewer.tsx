'use client'

import { useState, useTransition } from 'react'
import type { DecryptedCredential } from '@/lib/awards/staff/credentials'
import { GrowText } from '@/components/GrowText/GrowText'
import { revealCredentialsAction } from './actions'
import styles from '../../admin.module.scss'

type Props = {
  entryId: string
  locale: string
  count: number
  copy: {
    show: string
    hide: string
    error: string
    label: string
    value: string
    notes: string
  }
}

/**
 * The decrypted login details live only in this component's state: the button asks the server
 * (which logs the view), the answer is shown, and "Hide" or leaving the page drops it. Nothing
 * is written to storage, the URL or the cache.
 */
export function CredentialsViewer({ entryId, locale, count, copy }: Props) {
  const [items, setItems] = useState<DecryptedCredential[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [pending, start] = useTransition()

  const reveal = () =>
    start(async () => {
      setFailed(false)
      const result = await revealCredentialsAction(entryId, locale).catch(
        () => ({ ok: false }) as const,
      )
      if (result.ok) setItems(result.items)
      else setFailed(true)
    })

  return (
    <div>
      <p className={styles.actions}>
        {items === null ? (
          <button
            type="button"
            className={`btn-grow ${styles.secondary}`}
            onClick={reveal}
            disabled={pending || count === 0}
            data-testid="reveal-credentials"
          >
            <GrowText>{copy.show}</GrowText>
          </button>
        ) : (
          <button type="button" className={`btn-grow ${styles.secondary}`} onClick={() => setItems(null)}>
            <GrowText>{copy.hide}</GrowText>
          </button>
        )}
      </p>
      <div role="status" aria-live="polite">
        {failed && <p className={styles.error}>{copy.error}</p>}
        {items && (
          <ul className={styles.credentials} data-testid="credentials">
            {items.map((c, i) => (
              <li key={i}>
                <dl className={styles.facts}>
                  {c.label && (
                    <>
                      <dt>{copy.label}</dt>
                      <dd>{c.label}</dd>
                    </>
                  )}
                  <dt>{copy.value}</dt>
                  <dd className={styles.pre}>{c.value}</dd>
                  {c.notes && (
                    <>
                      <dt>{copy.notes}</dt>
                      <dd className={styles.pre}>{c.notes}</dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
