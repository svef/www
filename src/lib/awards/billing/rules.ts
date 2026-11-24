import { z } from 'zod'
import { validateKennitala } from '../kennitala'
import { formatError } from '../messages'
import type { Localized } from '../types'

/**
 * What a billing profile holds and when it is valid. Pure: the form validates with this
 * as people type, and the server action validates again with the same function before
 * anything is written.
 */
export type BillingFieldKey = 'companyName' | 'kennitala' | 'invoiceEmail' | 'address' | 'reference'

export const BILLING_FIELDS: readonly BillingFieldKey[] = [
  'companyName',
  'kennitala',
  'invoiceEmail',
  'address',
  'reference',
]

export const BILLING_LIMITS = {
  companyName: 120,
  address: 300,
  reference: 120,
  invoiceEmail: 254,
} as const

export type BillingInput = Partial<Record<BillingFieldKey, string | null | undefined>>

export type BillingData = {
  companyName: string
  /** Ten digits, no hyphen. */
  kennitala: string
  invoiceEmail: string
  address: string
  reference: string | null
}

export type BillingFieldError = {
  field: BillingFieldKey
  code: string
  message: Localized
}

export type BillingResult =
  { ok: true; data: BillingData } | { ok: false; errors: BillingFieldError[] }

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const email = z.email()

export function validateBillingInput(input: BillingInput): BillingResult {
  const errors: BillingFieldError[] = []
  const fail = (field: BillingFieldKey, code: string, params?: Record<string, string | number>) =>
    errors.push({ field, code, message: formatError(code, params) })

  const companyName = trim(input.companyName)
  const address = trim(input.address)
  const invoiceEmail = trim(input.invoiceEmail)
  const reference = trim(input.reference)
  const rawKennitala = trim(input.kennitala)

  if (!companyName) fail('companyName', 'required')
  else if (companyName.length > BILLING_LIMITS.companyName)
    fail('companyName', 'tooLong', { max: BILLING_LIMITS.companyName })

  let kennitala = ''
  if (!rawKennitala) fail('kennitala', 'required')
  else {
    const k = validateKennitala(rawKennitala)
    if (k.valid) kennitala = k.normalized
    else fail('kennitala', k.reason === 'format' ? 'kennitalaFormat' : 'kennitalaInvalid')
  }

  if (!invoiceEmail) fail('invoiceEmail', 'required')
  else if (
    invoiceEmail.length > BILLING_LIMITS.invoiceEmail ||
    !email.safeParse(invoiceEmail).success
  )
    fail('invoiceEmail', 'invalidEmail')

  if (!address) fail('address', 'required')
  else if (address.length > BILLING_LIMITS.address)
    fail('address', 'tooLong', { max: BILLING_LIMITS.address })

  if (reference.length > BILLING_LIMITS.reference)
    fail('reference', 'tooLong', { max: BILLING_LIMITS.reference })

  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    data: { companyName, kennitala, invoiceEmail, address, reference: reference || null },
  }
}

/** `0101302989` to `010130-2989`, the way a kennitala is written. */
export function formatKennitala(digits: string): string {
  return /^\d{10}$/.test(digits) ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits
}

/** A profile as the client sees it. */
export type BillingProfileView = BillingData & { id: string; inUse: number }
