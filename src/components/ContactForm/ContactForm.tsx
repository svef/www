'use client'

import { useState } from 'react'
import styles from './ContactForm.module.scss'

export interface ContactFormLabels {
  name: string
  email: string
  message: string
  submit: string
  success: string
}

// UI only for now — TODO: wire to a route handler / email on submit.
export function ContactForm({ labels }: { labels: ContactFormLabels }) {
  const [sent, setSent] = useState(false)

  if (sent) {
    return <p className={styles.success}>{labels.success}</p>
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
      }}
    >
      <label className={styles.field}>
        <span>{labels.name}</span>
        <input type="text" name="name" required className={styles.input} />
      </label>
      <label className={styles.field}>
        <span>{labels.email}</span>
        <input type="email" name="email" required className={styles.input} />
      </label>
      <label className={styles.field}>
        <span>{labels.message}</span>
        <textarea name="message" required rows={5} className={styles.input} />
      </label>
      <button type="submit" className={styles.submit}>
        {labels.submit}
      </button>
    </form>
  )
}
