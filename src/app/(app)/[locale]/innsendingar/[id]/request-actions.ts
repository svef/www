'use server'

import { getAwardsDb } from '@/lib/awards/db/client'
import { markRequestDone, replyToRequest, type RequestActionDenied } from '@/lib/awards/requests/service'
import { getCurrentUserId, getRequestNow } from '@/lib/awards/session'

/**
 * The entrant's side of a request (svef/www#169): a reply in the thread, and "Mark as done"
 * with an optional reply. Thin, like the project actions: identify the caller and the request
 * clock, call the service, return a plain result. The service decides who may act (the project's
 * creator or an accepted editor) from the request itself, so nothing here trusts the client.
 */
export type RequestActionResult =
  | { ok: true; returned?: boolean }
  | { ok: false; reason: RequestActionDenied | 'unexpected' | 'not_signed_in' }

async function run(
  fn: (userId: string, now: Date) => Promise<RequestActionResult>,
): Promise<RequestActionResult> {
  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch {
    return { ok: false, reason: 'not_signed_in' }
  }
  try {
    return await fn(userId, await getRequestNow())
  } catch (e) {
    console.error('[awards] request action failed', e)
    return { ok: false, reason: 'unexpected' }
  }
}

export async function replyToRequestAction(
  requestId: string,
  message: string,
): Promise<RequestActionResult> {
  return run(async (userId, now) => {
    const r = await replyToRequest(getAwardsDb(), {
      requestId,
      side: 'entrant',
      actor: { userId, roles: [] },
      message,
      now,
    })
    return r.ok ? { ok: true } : r
  })
}

export async function markRequestDoneAction(
  requestId: string,
  reply: string,
): Promise<RequestActionResult> {
  return run(async (userId, now) => {
    const r = await markRequestDone(getAwardsDb(), {
      requestId,
      actor: { userId, roles: [] },
      reply,
      now,
    })
    return r.ok ? { ok: true, returned: r.returned } : r
  })
}
