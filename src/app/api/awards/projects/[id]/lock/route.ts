import { getAwardsDb } from '@/lib/awards/db/client'
import { releaseEditLock } from '@/lib/awards/projects/service'
import { getCurrentUserId, getRequestNow } from '@/lib/awards/session'

/**
 * `POST /api/awards/projects/:id/lock`: release my edit lock. The target of
 * `navigator.sendBeacon` when the page is left, which can't use a server action.
 * Best effort and idempotent; always 204, so a beacon never reports a failure
 * nobody could act on. It can only ever release the caller's own lock.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await releaseEditLock(getAwardsDb(), {
      userId: await getCurrentUserId(),
      projectId: id,
      now: await getRequestNow(),
    })
  } catch {
    // Not signed in, or no such project: nothing to release.
  }
  return new Response(null, { status: 204 })
}
