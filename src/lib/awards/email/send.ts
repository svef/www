import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Resend } from 'resend'
import type { EmailContent } from './templates'

export interface OutgoingEmail extends EmailContent {
  to: string
}

/** Where messages go when no Resend key is set (never in production). */
export const OUTBOX_DIR = '.awards-outbox'

const LOCAL_FROM = 'SVEF <awards@localhost>'

/**
 * Send one email. Shared by every awards email (verification, reset, receipts,
 * invitations, reminders).
 *
 * - `RESEND_API_KEY` set: sent through Resend, from `AWARDS_EMAIL_FROM`.
 * - Not set, outside production: written to `.awards-outbox/` as JSON (and
 *   logged) so account flows work locally and e2e tests can read the links.
 * - Not set in production: an error (unless the e2e server opts in, see `outboxAllowed`). A silently dropped verification email
 *   would look exactly like a working one.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AWARDS_EMAIL_FROM

  if (apiKey) {
    if (!from) throw new Error('AWARDS_EMAIL_FROM is not set.')
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    if (error) throw new Error(`Resend rejected the message: ${error.message}`)
    return
  }

  if (!outboxAllowed()) {
    throw new Error('RESEND_API_KEY is not set; refusing to drop an email in production.')
  }

  await writeOutbox({ ...message, from: from ?? LOCAL_FROM })
}

/**
 * The outbox exists for local work. `next start` is a production build too, so
 * the e2e server opts in with `AWARDS_EMAIL_OUTBOX=1`; a real production
 * deployment (`VERCEL_ENV=production`) never can, whatever is set.
 */
function outboxAllowed(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false
  return process.env.NODE_ENV !== 'production' || process.env.AWARDS_EMAIL_OUTBOX === '1'
}

async function writeOutbox(message: OutgoingEmail & { from: string }): Promise<void> {
  const dir = path.join(process.cwd(), OUTBOX_DIR)
  await mkdir(dir, { recursive: true })
  const safeTo = message.to.replace(/[^a-z0-9@._+-]/gi, '_')
  const file = path.join(dir, `${Date.now()}-${safeTo}.json`)
  await writeFile(file, JSON.stringify({ ...message, createdAt: new Date().toISOString() }, null, 2))
  console.info(`[awards email] to ${message.to}: "${message.subject}" written to ${OUTBOX_DIR}/`)
}
