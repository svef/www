'use server'

import { getAwardsDb } from '@/lib/awards/db/client'
import { AwardsError, type ActionResult } from '@/lib/awards/projects/errors'
import {
  acquireEditLock,
  heartbeatEditLock,
  loadProject,
  saveAnswers,
  setCategories,
} from '@/lib/awards/projects/service'
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
): Promise<ActionResult<{ held: boolean; lock: LockInfo }>> {
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
