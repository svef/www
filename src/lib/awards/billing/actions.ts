'use server'

import { getAwardsDb } from '../db/client'
import { AwardsError, type ActionResult } from '../projects/errors'
import { getCurrentUserId } from '../session'
import type { BillingInput, BillingProfileView } from './rules'
import {
  createBillingProfile,
  deleteBillingProfile,
  listBillingProfiles,
  updateBillingProfile,
} from './service'

/**
 * Server actions for billing profiles: list, create, edit and delete the signed-in
 * user's own. The acting user always comes from the session, never from an argument,
 * so there is no way to ask for someone else's.
 */

async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn(await getCurrentUserId()) }
  } catch (e) {
    if (e instanceof AwardsError) return { ok: false, error: e.toPayload() }
    console.error('[awards] billing action failed', e)
    return { ok: false, error: { code: 'unexpected', message: 'Something went wrong.' } }
  }
}

export async function listBillingProfilesAction(): Promise<ActionResult<BillingProfileView[]>> {
  return run((userId) => listBillingProfiles(getAwardsDb(), { userId }))
}

export async function createBillingProfileAction(
  input: BillingInput,
): Promise<ActionResult<BillingProfileView>> {
  return run((userId) => createBillingProfile(getAwardsDb(), { userId, input }))
}

export async function updateBillingProfileAction(
  id: string,
  input: BillingInput,
): Promise<ActionResult<BillingProfileView>> {
  return run((userId) => updateBillingProfile(getAwardsDb(), { userId, id, input }))
}

export async function deleteBillingProfileAction(id: string): Promise<ActionResult<null>> {
  return run(async (userId) => {
    await deleteBillingProfile(getAwardsDb(), { userId, id })
    return null
  })
}
