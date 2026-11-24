import { getAwardsDb } from '@/lib/awards/db/client'
import { releaseEditLock } from '@/lib/awards/projects/service'
import { getCurrentUserId, getRequestNow } from '@/lib/awards/session'

/**
 * `POST /api/awards/projects/:id/lock`: release my edit lock. The target of
 * `navigator.sendBeacon` when the page is left, which can't use a server action.
 * Best effort and idempotent; always 204, so a beacon never reports a failure
 * nobody could act on. It releases only the caller's own lock, and only the acquisition the token belongs to: a late
 * beacon from a page that has since been reloaded must not delete its successor's lock.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // The beacon's text body is the token this page was issued when it took the lock.
    const token = (await request.text()).trim()
    await releaseEditLock(getAwardsDb(), {
      userId: await getCurrentUserId(),
      projectId: id,
      token,
      now: await getRequestNow(),
    })
  } catch {
    // Not signed in, or no such project: nothing to release.
  }
  return new Response(null, { status: 204 })
}
