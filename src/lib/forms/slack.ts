/**
 * Posting a submission to Slack.
 *
 * Two incoming webhooks, one per channel, each read from the environment. A
 * webhook URL is a bearer credential — anyone holding it can post to that
 * channel — so these are never `NEXT_PUBLIC_*` and never reach the browser.
 *
 * **Delivery here is best-effort, and deliberately so.** The row in Postgres is
 * the record; Slack is the notification. If Slack is down, or a webhook has been
 * revoked, or someone pasted the URL wrong, the submission must still be kept
 * and the person must still be thanked — losing someone's words because a chat
 * service was unavailable would be the worse failure. So this never throws: it
 * reports what happened and the caller logs it.
 */

export type SlackChannel = 'feedback' | 'talks'

const WEBHOOK_ENV: Record<SlackChannel, string> = {
  feedback: 'SLACK_WEBHOOK_FEEDBACK',
  talks: 'SLACK_WEBHOOK_TALKS',
}

export type SlackResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'rejected' | 'unreachable'; detail?: string }

/** One labelled line of a submission. Blank values are dropped by `postToSlack`. */
export interface SlackField {
  label: string
  value: string | null | undefined
}

/**
 * Renders as Slack mrkdwn rather than Block Kit.
 *
 * Block Kit would look tidier, but a submission is a handful of labelled lines
 * and mrkdwn survives being quoted, searched and copied out of Slack intact —
 * which is what someone acting on one of these actually does.
 */
function render(heading: string, fields: SlackField[]): string {
  const lines = fields
    .filter((field) => field.value != null && field.value.trim() !== '')
    .map((field) => `*${field.label}:* ${field.value!.trim()}`)
  return [`*${heading}*`, '', ...lines].join('\n')
}

export async function postToSlack(
  channel: SlackChannel,
  heading: string,
  fields: SlackField[],
): Promise<SlackResult> {
  const url = process.env[WEBHOOK_ENV[channel]]
  if (!url) {
    return { ok: false, reason: 'not-configured', detail: WEBHOOK_ENV[channel] }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: render(heading, fields) }),
      // A submission must not sit waiting on Slack. The row is already saved by
      // the time this runs, so giving up is cheap and the person gets their
      // confirmation either way.
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return { ok: false, reason: 'rejected', detail: `${res.status} ${res.statusText}` }
    }
    return { ok: true }
  } catch (cause) {
    return {
      ok: false,
      reason: 'unreachable',
      detail: cause instanceof Error ? cause.message : String(cause),
    }
  }
}
