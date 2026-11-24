import { timingSafeEqual } from 'node:crypto'
import { getAwardsDb } from '@/lib/awards/db/client'
import { sweepPendingFiles } from '@/lib/awards/files/images'
import { getObjectStore, isStoreConfigured } from '@/lib/awards/files/store'
import { serverNow } from '@/lib/awards/staff/clock'

/**
 * `GET /api/awards/cron/file-cleanup`: the daily sweep of uploads that never finished. A `pending`
 * `entry_file` older than an hour (the browser never PUT the file, or never asked for it to be
 * checked) is rejected and its object deleted. Idempotent. Scheduled in `vercel.json`.
 *
 * Guarded like the other crons: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`, and with
 * no secret configured every call is refused. An authorised caller may pass `?now=<ISO instant>`
 * (ignored on Vercel production), which is how the tests age a file without waiting an hour.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const wanted = Buffer.from(`Bearer ${secret}`)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}

function clock(request: Request): Date {
  const override = new URL(request.url).searchParams.get('now')
  if (override && process.env.VERCEL_ENV !== 'production') {
    const at = new Date(override)
    if (!Number.isNaN(at.getTime())) return at
  }
  return serverNow()
}

export async function GET(request: Request): Promise<Response> {
  if (!authorised(request)) return new Response('Unauthorized', { status: 401 })
  // Without a bucket there can be no objects to clean up.
  if (!isStoreConfigured()) return Response.json({ swept: 0, storage: 'not configured' })
  const { swept } = await sweepPendingFiles(getAwardsDb(), getObjectStore(), {
    now: clock(request),
  })
  return Response.json({ swept })
}
