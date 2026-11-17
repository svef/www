/**
 * Splits the bylaws Markdown (README of svef/Laws) into its title and numbered articles,
 * so the page can set each article as a row with its number in a stepped block.
 *
 * The source is one document written to stand alone: an optional `# Title`, then one
 * `### N. gr.` heading per article. Splitting on the headings rather than parsing the
 * prose keeps the text itself exactly as the association wrote it — the article bodies
 * are handed back as Markdown, untouched.
 *
 * Anything that does not look like that (no article headings at all, say because the
 * source was reshaped) comes back as `articles: []` with the whole document in
 * `preamble`, and the page renders it as plain Markdown instead of dropping text.
 */
export interface BylawsArticle {
  /** The heading as written, e.g. "1. gr." */
  heading: string
  /** The number the heading starts with, e.g. "1"; the heading itself if it has none. */
  number: string
  /** The article's Markdown, without its heading. */
  markdown: string
}

export interface ParsedBylaws {
  /** The document's `# ` title, or `null`. */
  title: string | null
  /** Markdown before the first article (usually empty). */
  preamble: string
  articles: BylawsArticle[]
}

const ARTICLE_HEADING = /^###\s+(.+?)\s*#*\s*$/
const TITLE_HEADING = /^#\s+(.+?)\s*#*\s*$/

export function parseBylaws(markdown: string): ParsedBylaws {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')

  let title: string | null = null
  const preamble: string[] = []
  const articles: { heading: string; body: string[] }[] = []
  let fenced = false

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced

    const article = fenced ? null : ARTICLE_HEADING.exec(line)
    if (article) {
      articles.push({ heading: article[1], body: [] })
      continue
    }
    const current = articles[articles.length - 1]
    if (current) {
      current.body.push(line)
      continue
    }
    const heading = fenced ? null : TITLE_HEADING.exec(line)
    if (heading && title === null) {
      title = heading[1]
      continue
    }
    preamble.push(line)
  }

  return {
    title,
    preamble: preamble.join('\n').trim(),
    articles: articles.map(({ heading, body }) => ({
      heading,
      number: /^(\d+)/.exec(heading)?.[1] ?? heading,
      markdown: body.join('\n').trim(),
    })),
  }
}
