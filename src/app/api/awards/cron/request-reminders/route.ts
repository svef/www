import { timingSafeEqual } from 'node:crypto'
import { getAwardsDb } from '@/lib/awards/db/client'
import { sendDueRequestReminders } from '@/lib/awards/requests/reminders'
import { serverNow } from '@/lib/awards/staff/clock'

/**
 * `GET /api/awards/cron/request-reminders`: the hourly sweep that sends the ~24 h request
 * deadline reminders. Scheduled in `vercel.json` (`crons`).
 *
 * Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>` when the `CRON_SECRET`
 * environment variable is set, so the same variable guards the route. It fails closed: with no
 * secret configured every call is refused, because an open route would let anyone trigger
 * mail. The sweep is idempotent (see `sendDueRequestReminders`), so a retried or doubled
 * invocation sends nothing twice.
 *
 * The clock is the staff clock (`serverNow`): the real time, except where a test overrides it
 * (never on Vercel production). The handler reads the request's headers, so Next never caches
 * it (no `force-dynamic` needed).
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const wanted = Buffer.from(`Bearer ${secret}`)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}

export async function GET(request: Request): Promise<Response> {
  if (!authorised(request)) return new Response('Unauthorized', { status: 401 })
  const { reminded } = await sendDueRequestReminders(getAwardsDb(), { now: serverNow() })
  return Response.json({
    reminded: reminded.length,
    results: reminded.map((r) => r.result),
  })
}
