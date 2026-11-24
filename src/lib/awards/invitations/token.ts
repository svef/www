import { createHash, randomBytes } from 'node:crypto'

/** How long an invitation can be accepted: long enough for a busy week, short enough to expire. */
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Least time between two sends to the same person, so "Resend" cannot be used to flood an inbox. */
export const RESEND_MIN_INTERVAL_MS = 60 * 1000

/** A fresh unguessable token (256 bits). Only its hash is stored; the raw value lives in the email. */
export function newInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const inviteExpiry = (now: Date) => new Date(now.getTime() + INVITE_TTL_MS)

/** Emails compare case-insensitively and ignoring surrounding space. */
export const normalizeEmail = (email: string | null | undefined) =>
  (email ?? '').trim().toLowerCase()
