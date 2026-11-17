import type { ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseBylaws } from '@/lib/bylaws-articles'
import { remarkHeadingLevels } from '@/lib/remark-heading-levels'
import styles from './Bylaws.module.scss'

type Plugins = ComponentProps<typeof ReactMarkdown>['remarkPlugins']

// Article bodies have no headings of their own today; if one appears it nests under the
// article's `<h3>`.
const PLUGINS: Plugins = [remarkGfm, [remarkHeadingLevels, { startLevel: 4 }]]

/**
 * The bylaws text (the export's `.laws-prose`): the title, then each article as a row with
 * its number in a violet stepped block on the left and the article beside it.
 *
 * `markdown` is the README of svef/Laws, fetched by `src/lib/bylaws.ts`; the text is
 * rendered as written. If it cannot be split into articles it is rendered as one block.
 * Outline: the page's `<h1>`, this `<h2>` title, then an `<h3>` per article.
 */
export function BylawsText({ markdown, lang }: { markdown: string; lang: string }) {
  const { title, preamble, articles } = parseBylaws(markdown)
  return (
    <div className={styles.text} lang={lang}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {preamble && (
        <div className={styles.body}>
          <ReactMarkdown remarkPlugins={PLUGINS}>{preamble}</ReactMarkdown>
        </div>
      )}
      {articles.map((article) => (
        <section key={article.heading} className={styles.article}>
          <h3 className={styles.number}>
            <span aria-hidden="true">{article.number}</span>
            <span className="sr-only">{article.heading}</span>
          </h3>
          <div className={styles.body}>
            <ReactMarkdown remarkPlugins={PLUGINS}>{article.markdown}</ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  )
}
