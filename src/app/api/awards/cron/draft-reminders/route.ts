import { timingSafeEqual } from 'node:crypto'
import { getAwardsDb } from '@/lib/awards/db/client'
import { sendDueDraftReminders } from '@/lib/awards/reminders/send'
import { serverNow } from '@/lib/awards/staff/clock'

/**
 * `GET /api/awards/cron/draft-reminders`: the daily sweep that sends the draft reminders, a few
 * days before the early-bird deadline and again before intake closes. Staff can run the same
 * sweep from the staff area.
 * Scheduled in `vercel.json` (`crons`); a daily schedule works on every Vercel plan.
 *
 * Guarded like the request-reminder cron: Vercel Cron sends `Authorization: Bearer
 * <CRON_SECRET>`, and with no secret configured every call is refused. The sweep is idempotent
 * (see `sendDueDraftReminders`), so a retried or doubled invocation sends nothing twice.
 *
 * The clock is the staff clock (`serverNow`). For tests, an authorised caller may also pass
 * `?now=<ISO instant>`; it is ignored on Vercel production, like `AWARDS_CLOCK_NOW`.
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
  const { wave, reminded } = await sendDueDraftReminders(getAwardsDb(), { now: clock(request) })
  return Response.json({
    wave,
    reminded: reminded.length,
    results: reminded.map((r) => r.result),
  })
}
