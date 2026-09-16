import type { Locale } from '@/lib/i18n'
import styles from './TranslationNote.module.scss'

export interface TranslationNoteProps {
  /** The locale the reader asked for — the one in the URL. */
  pageLocale: Locale
  /** The locale the content on the page is actually written in. */
  contentLocale: Locale
  /** The notice itself (`dictionary.translationNote`). */
  children: string
}

/**
 * Tells an English reader that the page below is showing Icelandic.
 *
 * Icelandic is the source of truth and English is translated as it is written,
 * so `/en` falls back field by field. Without a word about it the page looks
 * like a bug; with one it reads as a site that is honest about what it has.
 * The strip and its wording are in the design export.
 *
 * Renders nothing when the content is in the locale that was asked for, so a
 * page can always render it and never has to reason about when it applies.
 */
export function TranslationNote({
  pageLocale,
  contentLocale,
  children,
}: TranslationNoteProps) {
  if (pageLocale === contentLocale) return null
  return (
    <div className={styles.wrap}>
      <p className={styles.note} lang={pageLocale}>
        {children}
      </p>
    </div>
  )
}
