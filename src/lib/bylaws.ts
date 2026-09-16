/**
 * `HEAD` resolves to whatever the default branch of svef/Laws currently is, so the
 * site does not have to know or track it. (It is `master`, not `main` — hardcoding
 * `main` is what silently broke this page.) raw.githubusercontent.com serves the
 * `HEAD` ref directly, so this needs no GitHub API call and no token.
 */
const LAWS_RAW_URL =
  process.env.GITHUB_LAWS_RAW_URL ||
  'https://raw.githubusercontent.com/svef/Laws/HEAD/README.md'

/**
 * Fetch the SVEF bylaws (Lög) as Markdown from the public svef/Laws README at
 * build time. Icelandic-only for now; an EN translation lands before launch.
 * A GitHub Action on svef/Laws pings a Vercel Deploy Hook so edits trigger a rebuild.
 *
 * Throws rather than degrading gracefully: the bylaws are the association's
 * governing document, and a page that quietly renders without them is worse than
 * a build that fails. Failing here fails `next build`, so a broken source URL
 * cannot reach production unnoticed. During an ISR revalidation Next keeps serving
 * the last good page and logs the error, so visitors are not affected by a
 * transient GitHub outage.
 */
export async function getBylawsMarkdown(): Promise<string> {
  let res: Response
  try {
    res = await fetch(LAWS_RAW_URL, { next: { revalidate: 3600 } })
  } catch (cause) {
    throw new Error(`Failed to fetch SVEF bylaws from ${LAWS_RAW_URL}`, { cause })
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch SVEF bylaws from ${LAWS_RAW_URL}: ${res.status} ${res.statusText}`,
    )
  }

  const markdown = await res.text()
  if (!markdown.trim()) {
    throw new Error(`SVEF bylaws source at ${LAWS_RAW_URL} is empty`)
  }

  return markdown
}
