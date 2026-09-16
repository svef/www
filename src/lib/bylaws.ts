/**
 * The canonical source of the SVEF bylaws is the README of the public `svef/Laws`
 * repository. That is a deliberate association decision, so this repo never keeps a
 * second copy of the text.
 *
 * `HEAD` resolves to whatever the default branch of svef/Laws currently is, so the
 * site does not have to know or track it. (It is `master`, not `main` — hardcoding
 * `main` is what silently broke this page.) raw.githubusercontent.com serves the
 * `HEAD` ref directly, so this needs no GitHub API call and no token.
 *
 * The URL is intentionally NOT configurable. An environment override bought nothing —
 * `HEAD` is already self-correcting — while making it possible for a stale value in a
 * hosting dashboard to silently point the association's governing document at the
 * wrong place, or at nothing.
 */
export const LAWS_RAW_URL = 'https://raw.githubusercontent.com/svef/Laws/HEAD/README.md'

/** Human-facing link to the same source, for the degraded-mode notice. */
export const LAWS_REPO_URL = 'https://github.com/svef/Laws'

/**
 * raw.githubusercontent.com is unauthenticated and rate-limits by source IP, and
 * Vercel build IPs are shared. A single blip must not fail a build, so transient
 * failures are retried with a short linear backoff.
 */
const DEFAULT_ATTEMPTS = 3
const DEFAULT_BACKOFF_MS = 500

/**
 * A failure that retrying cannot fix: the source moved (404/410) or is empty.
 * These fail immediately instead of burning the retry budget on a doomed build.
 */
class PermanentBylawsError extends Error {}

/** Just the slice of the environment this module reads, so tests can pass a literal. */
type EnvLike = Record<string, string | undefined>

export type BylawsResult =
  | { status: 'ok'; markdown: string }
  | { status: 'unavailable'; reason: string }

/**
 * Deliberate, opt-in escape hatch for a third-party outage.
 *
 * Normally a broken bylaws source fails `next build`, which is the right default: a
 * page that quietly renders without the association's governing document is worse
 * than a build that fails. But raw.githubusercontent.com is a third party, so without
 * an escape hatch a GitHub incident blocks *every* deploy of this site — including an
 * urgent, unrelated hotfix — with no recovery path but editing code mid-incident.
 *
 * Setting `BYLAWS_ALLOW_DEGRADED=1` downgrades that hard failure to a build warning.
 * The page then renders a visible notice linking to the canonical source instead of
 * the bylaws text. It is off by default and has to be set by a person on purpose, so
 * the silent degradation this change fixes cannot come back on its own.
 */
export function degradedModeAllowed(env: EnvLike = process.env): boolean {
  return env.BYLAWS_ALLOW_DEGRADED === '1' || env.BYLAWS_ALLOW_DEGRADED === 'true'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** One attempt. Throws `PermanentBylawsError` for failures that must not be retried. */
async function attemptFetch(): Promise<string> {
  let res: Response
  try {
    res = await fetch(LAWS_RAW_URL, { next: { revalidate: 3600 } })
  } catch (cause) {
    throw new Error(`Failed to fetch SVEF bylaws from ${LAWS_RAW_URL}`, { cause })
  }

  if (!res.ok) {
    const message = `Failed to fetch SVEF bylaws from ${LAWS_RAW_URL}: ${res.status} ${res.statusText}`
    throw res.status === 404 || res.status === 410
      ? new PermanentBylawsError(message)
      : new Error(message)
  }

  let markdown: string
  try {
    // Reading the body can fail mid-stream, separately from the response itself.
    markdown = await res.text()
  } catch (cause) {
    throw new Error(`Failed to read SVEF bylaws body from ${LAWS_RAW_URL}`, { cause })
  }

  if (!markdown.trim()) {
    throw new PermanentBylawsError(`SVEF bylaws source at ${LAWS_RAW_URL} is empty`)
  }

  return markdown
}

async function fetchBylawsMarkdown(attempts: number, backoffMs: number): Promise<string> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await attemptFetch()
    } catch (error) {
      if (error instanceof PermanentBylawsError) throw error
      lastError = error
      if (attempt < attempts) await sleep(backoffMs * attempt)
    }
  }

  throw lastError
}

/**
 * Fetch the SVEF bylaws (Lög) as Markdown at build time. Icelandic-only for now; an
 * EN translation lands before launch. A GitHub Action on svef/Laws pings a Vercel
 * Deploy Hook so edits to the bylaws trigger a rebuild.
 *
 * Throws by default rather than degrading silently — see the module comment and
 * `degradedModeAllowed` above. During an ISR revalidation Next keeps serving the last
 * good page and logs the error, so visitors are not affected by a transient outage.
 */
export async function getBylaws(
  options: { attempts?: number; backoffMs?: number; env?: EnvLike } = {},
): Promise<BylawsResult> {
  const {
    attempts = DEFAULT_ATTEMPTS,
    backoffMs = DEFAULT_BACKOFF_MS,
    env = process.env,
  } = options

  try {
    return { status: 'ok', markdown: await fetchBylawsMarkdown(attempts, backoffMs) }
  } catch (error) {
    if (!degradedModeAllowed(env)) throw error

    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[bylaws] BYLAWS_ALLOW_DEGRADED is set — continuing the build without the bylaws. ${reason}`,
    )
    return { status: 'unavailable', reason }
  }
}
