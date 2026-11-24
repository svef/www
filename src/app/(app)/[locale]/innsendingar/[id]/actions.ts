'use server'

import { getAwardsDb } from '@/lib/awards/db/client'
import { AwardsError, type ActionResult } from '@/lib/awards/projects/errors'
import {
  acquireEditLock,
  heartbeatEditLock,
  loadProject,
  saveAnswers,
  setCategories,
  setProjectBillingProfile,
} from '@/lib/awards/projects/service'
import { resendInvitation } from '@/lib/awards/invitations/service'
import type { InviteState } from '@/lib/awards/invitations/types'
import { submitEntries, type SubmitResult } from '@/lib/awards/projects/submit'
import { withdrawEntry, type WithdrawResult } from '@/lib/awards/projects/withdraw'
import type { ProjectView, SaveAnswersPatch, SaveResult } from '@/lib/awards/projects/types'
import type { LockInfo } from '@/lib/awards/projects/errors'
import { getCurrentUserId, getRequestNow } from '@/lib/awards/session'

/**
 * Server actions for the project form. Thin: identify the caller and the clock,
 * call the service, and turn a typed refusal into a plain result the client can
 * branch on. Anything unexpected is logged and reported as `unexpected`, which
 * the form shows as "Not saved — retry".
 */

async function run<T>(fn: (userId: string, now: Date) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const userId = await getCurrentUserId()
    return { ok: true, value: await fn(userId, await getRequestNow()) }
  } catch (e) {
    if (e instanceof AwardsError) return { ok: false, error: e.toPayload() }
    console.error('[awards] project action failed', e)
    return { ok: false, error: { code: 'unexpected', message: 'Something went wrong.' } }
  }
}

export async function loadProjectAction(projectId: string): Promise<ActionResult<ProjectView>> {
  return run((userId, now) => loadProject(getAwardsDb(), { userId, projectId, now }))
}

export async function acquireLockAction(
  projectId: string,
): Promise<ActionResult<{ held: boolean; lock: LockInfo; token?: string }>> {
  return run((userId, now) => acquireEditLock(getAwardsDb(), { userId, projectId, now }))
}

export async function heartbeatAction(projectId: string): Promise<ActionResult<LockInfo>> {
  return run((userId, now) => heartbeatEditLock(getAwardsDb(), { userId, projectId, now }))
}

export async function saveAnswersAction(
  projectId: string,
  patch: SaveAnswersPatch,
): Promise<ActionResult<SaveResult>> {
  return run((userId, now) => saveAnswers(getAwardsDb(), { userId, projectId, patch, now }))
}

/** Sets the categories, and returns the refreshed project (entries and editability change with them). */
export async function setCategoriesAction(
  projectId: string,
  categories: string[],
): Promise<ActionResult<ProjectView>> {
  return run(async (userId, now) => {
    const db = getAwardsDb()
    await setCategories(db, { userId, projectId, categories, now })
    return loadProject(db, { userId, projectId, now })
  })
}

/** Chooses (or clears) who is invoiced, and returns the refreshed project. */
export async function setBillingProfileAction(
  projectId: string,
  billingProfileId: string | null,
): Promise<ActionResult<ProjectView>> {
  return run(async (userId, now) => {
    const db = getAwardsDb()
    await setProjectBillingProfile(db, { userId, projectId, billingProfileId, now })
    return loadProject(db, { userId, projectId, now })
  })
}

/**
 * Submits every complete draft entry (or just `entryId`), locks the prices and sends the
 * receipt, and returns what happened together with the refreshed project.
 */
export async function submitAction(
  projectId: string,
  args: { entryId?: string; acceptTerms: boolean },
): Promise<ActionResult<{ result: SubmitResult; view: ProjectView }>> {
  return run(async (userId, now) => {
    const db = getAwardsDb()
    const result = await submitEntries(db, { userId, projectId, now, ...args })
    return { result, view: await loadProject(db, { userId, projectId, now }) }
  })
}

/** Withdraws one submitted entry (the creator only) and returns what was cleared with the refreshed project. */
export async function withdrawAction(
  projectId: string,
  entryId: string,
): Promise<ActionResult<{ result: WithdrawResult; view: ProjectView }>> {
  return run(async (userId, now) => {
    const db = getAwardsDb()
    const result = await withdrawEntry(db, { userId, projectId, entryId, now })
    return { result, view: await loadProject(db, { userId, projectId, now }) }
  })
}

/** Sends a collaborator a fresh invitation to edit (owners and editors may). */
export async function resendInvitationAction(
  projectId: string,
  personId: string,
): Promise<ActionResult<{ invites: InviteState[]; delivered: boolean }>> {
  return run((userId, now) => resendInvitation(getAwardsDb(), { userId, projectId, personId, now }))
}
