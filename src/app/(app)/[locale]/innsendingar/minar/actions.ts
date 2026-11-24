'use server'

import { planBulk, runBulk, type BulkResult } from '@/lib/awards/bulk/service'
import type { BulkKind, BulkPlan } from '@/lib/awards/bulk/plan'
import { getAwardsDb } from '@/lib/awards/db/client'
import { AwardsError, type ActionResult } from '@/lib/awards/projects/errors'
import { getCurrentUserId, getRequestNow } from '@/lib/awards/session'

/**
 * Server actions for the dashboard's bulk actions. Thin, like the project form's: identify the
 * caller and the clock, validate the shape of the request, call the service.
 */
export type BulkInput = { kind: BulkKind; entryIds: string[]; billingProfileId?: string }

const KINDS: readonly BulkKind[] = ['submit', 'withdraw', 'billing']
const MAX_ENTRIES = 500

function valid(input: BulkInput): boolean {
  return (
    KINDS.includes(input.kind) &&
    Array.isArray(input.entryIds) &&
    input.entryIds.length <= MAX_ENTRIES &&
    input.entryIds.every((id) => typeof id === 'string') &&
    (input.billingProfileId === undefined || typeof input.billingProfileId === 'string')
  )
}

async function run<T>(
  input: BulkInput,
  fn: (userId: string, now: Date) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    if (!valid(input)) throw new AwardsError('invalid_input', 'The selection is not valid.')
    const userId = await getCurrentUserId()
    return { ok: true, value: await fn(userId, await getRequestNow()) }
  } catch (e) {
    if (e instanceof AwardsError) return { ok: false, error: e.toPayload() }
    console.error('[awards] bulk action failed', e)
    return { ok: false, error: { code: 'unexpected', message: 'Something went wrong.' } }
  }
}

/** What the action would do right now, for the confirmation. Changes nothing. */
export async function planBulkAction(input: BulkInput): Promise<ActionResult<BulkPlan>> {
  return run(input, (userId, now) => planBulk(getAwardsDb(), { ...input, userId, now }))
}

/** Does it, project by project, and reports what was done and what was skipped. */
export async function runBulkAction(input: BulkInput): Promise<ActionResult<BulkResult>> {
  return run(input, (userId, now) => runBulk(getAwardsDb(), { ...input, userId, now }))
}
