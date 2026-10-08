import type { Locale } from '@/lib/i18n'
import styles from './TranslationNote.module.scss'

/**
 * Why the page below is not in the language the reader asked for.
 *
 * - `not-translated-yet` — Icelandic is the source of truth and the English
 *   copy has not been written. It is coming; the note says so.
 * - `icelandic-by-design` — the page is published in Icelandic only as an
 *   editorial decision (the awards winners archive, press, the bylaws). There
 *   is nothing to wait for, and apologising for a deliberate choice implies an
 *   omission that will never be filled.
 *
 * Getting this wrong is not cosmetic: it is the difference between "check back"
 * and "don't".
 */
export type TranslationReason = 'not-translated-yet' | 'icelandic-by-design'

/**
 * The strip's wording, in English only.
 *
 * This is the one string on the site with no Icelandic counterpart, so it is
 * not in the `is`/`en` dictionaries — those mirror each other, and a key that
 * can only ever be read in one of them invites a translation that is dead the
 * moment it is written. Only an English reader can see this strip: on `/is` the
 * content locale is always `is`, so the component renders nothing.
 */
const MESSAGES: Record<TranslationReason, string> = {
  'not-translated-yet':
    'English copy is not available for this page yet — showing Icelandic.',
  'icelandic-by-design': 'This page is published in Icelandic only.',
}

export interface TranslationNoteProps {
  /** The locale the reader asked for — the one in the URL. */
  pageLocale: Locale
  /** The locale the content on the page is actually written in. */
  contentLocale: Locale
  /** Why they differ. Defaults to the common case, a missing translation. */
  reason?: TranslationReason
}

/**
 * Tells an English reader that the page below is showing Icelandic, and why.
 *
 * Without a word about it the page looks like a bug; with one it reads as a
 * site that is honest about what it has. The strip and its wording are in the
 * design export.
 *
 * Renders nothing when the content is in the locale that was asked for, so a
 * page can always render it and never has to reason about when it applies.
 *
 * Render it as the first child of the page, i.e. the first thing inside
 * `<main id="main">`. The design export draws it above the content area, and
 * putting it above `<main>` instead would match that DOM exactly — but the
 * skip link targets `#main`, so a keyboard or screen-reader user skipping the
 * header would land *after* the note and never hear it. They are the readers
 * who most need to be told the page is showing Icelandic. Inside `<main>` the
 * rendered result is the same strip in the same place, and the skip link lands
 * before it.
 */
export function TranslationNote({
  pageLocale,
  contentLocale,
  reason = 'not-translated-yet',
}: TranslationNoteProps) {
  if (pageLocale === contentLocale) return null
  return (
    <div className={styles.wrap}>
      <p className={styles.note} lang={pageLocale}>
        {MESSAGES[reason]}
      </p>
    </div>
  )
}
