const LAWS_RAW_URL =
  process.env.GITHUB_LAWS_RAW_URL ||
  'https://raw.githubusercontent.com/svef/Laws/main/README.md'

/**
 * Fetch the SVEF bylaws (Lög) as Markdown from the public svef/Laws README at
 * build time. Icelandic-only for now; an EN translation lands before launch.
 * A GitHub Action on svef/Laws pings a Vercel Deploy Hook so edits trigger a rebuild.
 */
export async function getBylawsMarkdown(): Promise<string> {
  try {
    const res = await fetch(LAWS_RAW_URL, { next: { revalidate: 3600 } })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  }
}
