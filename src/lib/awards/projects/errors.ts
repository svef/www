import type { FieldError } from '../validation'
import type { SelectionViolation } from '../selection'

/** Who holds a live edit lock. Plain data: it crosses the server-action boundary. */
export type LockInfo = {
  holderUserId: string
  holderName: string
  /** ISO. When this holder took the lock ("is editing since 14:02"). */
  acquiredAt: string
  /** ISO. Last activity; the lock expires `ttl` after it. */
  lastActivityAt: string
  /** ISO. When the lock lapses if nothing else happens. */
  expiresAt: string
}

export type AwardsErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'lock_required'
  | 'invalid_input'
  | 'selection_invalid'
  | 'unknown_category'
  | 'cannot_remove_entry'
  | 'category_withdrawn'
  | 'no_edition'
  | 'billing_in_use'
  | 'intake_closed'
  | 'intake_not_open'
  | 'email_unverified'
  | 'billing_required'
  | 'terms_required'
  | 'nothing_to_submit'
  | 'not_withdrawable'
  | 'invite_not_allowed'
  | 'invite_too_soon'
  | 'storage_unavailable'
  | 'upload_missing'

/** The serialisable form of an `AwardsError`, returned by server actions. */
export type ErrorPayload = {
  code: AwardsErrorCode | 'unexpected'
  message: string
  /** `lock_required`: the live holder, or null when the lock is free/expired and can be taken. */
  lock?: LockInfo | null
  violations?: SelectionViolation[]
  fieldErrors?: FieldError[]
}

/** The typed refusal every service function throws. */
export class AwardsError extends Error {
  constructor(
    public readonly code: AwardsErrorCode,
    message: string,
    public readonly details: Omit<ErrorPayload, 'code' | 'message'> = {},
  ) {
    super(message)
    this.name = 'AwardsError'
  }

  toPayload(): ErrorPayload {
    return { code: this.code, message: this.message, ...this.details }
  }
}

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ErrorPayload }
