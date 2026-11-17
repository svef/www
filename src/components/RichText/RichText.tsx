import clsx from 'clsx'
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { Shape } from '@/components/Shape/Shape'
import styles from './RichText.module.scss'

export interface RichTextProps {
  /** The Lexical editor state stored by a Payload `richText` field. */
  data: SerializedEditorState | null | undefined
  className?: string
  /** Set when the copy is not in the page's language (see `pickLocalized`). */
  lang?: string
  /**
   * `article`: a centred reading column with larger text, and pull quotes drawn as violet
   * stepped shapes that run wider than the text (the export's `[data-news] .prose`).
   */
  variant?: 'default' | 'article'
}

/**
 * Pull quotes as the export draws them: a violet block with decorative corners at the
 * bottom-right and top-right, on the shape engine.
 */
const articleConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  quote: ({ node, nodesToJSX }) => (
    <Shape as="blockquote" color="violet" auto="br,tr" className={styles.quote}>
      {nodesToJSX({ nodes: node.children })}
    </Shape>
  ),
})

/**
 * Renders a Payload rich-text field as prose.
 *
 * Payload's converter emits plain semantic elements — `<p>`, `<h2>`, `<ul>`,
 * `<blockquote>`, `<a>` — so the styling is done here by element, once, rather
 * than by asking editors to pick classes. Nothing but the editor decides the
 * heading levels, so a body that starts at `<h2>` keeps the page outline right
 * under the page `<h1>`.
 *
 * Renders nothing for an empty field, so a page never shows an empty prose box.
 */
export function RichText({ data, className, lang, variant = 'default' }: RichTextProps) {
  if (!data) return null
  const article = variant === 'article'
  return (
    // `disableContainer` drops Payload's own wrapper so the prose sits directly
    // in this element and `lang` covers exactly the copy that came from the CMS.
    <div className={clsx(styles.prose, article && styles.article, className)} lang={lang}>
      <LexicalRichText
        data={data}
        disableContainer
        converters={article ? articleConverters : undefined}
      />
    </div>
  )
}
