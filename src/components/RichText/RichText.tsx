import clsx from 'clsx'
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import styles from './RichText.module.scss'

export interface RichTextProps {
  /** The Lexical editor state stored by a Payload `richText` field. */
  data: SerializedEditorState | null | undefined
  className?: string
  /** Set when the copy is not in the page's language (see `pickLocalized`). */
  lang?: string
}

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
export function RichText({ data, className, lang }: RichTextProps) {
  if (!data) return null
  return (
    // `disableContainer` drops Payload's own wrapper so the prose sits directly
    // in this element and `lang` covers exactly the copy that came from the CMS.
    <div className={clsx(styles.prose, className)} lang={lang}>
      <LexicalRichText data={data} disableContainer />
    </div>
  )
}
