import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'

/**
 * Resolving Payload's field-level localization.
 *
 * Kept free of any Payload import so it — and everything built on it — can be
 * unit tested without a database or a CMS bootstrap.
 */

/**
 * One localized field as it comes back from a `locale: 'all'` read.
 *
 * Payload's generated types describe the resolved single-locale shape
 * (`title: string`), so a `locale: 'all'` document has to be re-typed at the
 * boundary. Content modules in `src/lib/content/` do that in one place per
 * collection and hand pages plain, already-resolved values.
 */
export type AllLocales<T> = Partial<Record<Locale, T | null>> | null | undefined

/** A value together with the locale it is actually written in. */
export type Localized<T> = { value: T; locale: Locale }

/**
 * Resolve a localized field for a locale, falling back to Icelandic.
 *
 * Icelandic is the source of truth and English is translated as it gets
 * written, so an English read is expected to fall back. The returned `locale`
 * says which language the text is in, so the page can mark it up truthfully —
 * a `lang` attribute, and the design's "English copy is not available for this
 * page yet" note — rather than presenting Icelandic as English.
 *
 * An empty string counts as missing — **in both branches**. Payload writes `''`
 * for a localized text field that was opened in the admin and left blank, and
 * it does that for Icelandic as readily as for English. Guarding only the
 * requested locale left `{ is: '', en: '' }` resolving to `''` rather than
 * `null`, which every caller then had to undo for itself: three separate
 * workarounds had grown by the time svef/www#88 counted them, and the one place
 * that had not noticed silently dropped a media item's alt text
 * (`content/galleries-mapping.ts`, where a blank caption short-circuited `??`).
 * The rule belongs here, where the doc comment already claimed it was.
 */
export function pickLocalized<T>(
  field: AllLocales<T>,
  locale: Locale,
): Localized<T | null> {
  const own = field?.[locale]
  if (!isBlank(own)) return { value: own as T, locale }
  const fallback = field?.[DEFAULT_LOCALE]
  return { value: isBlank(fallback) ? null : (fallback as T), locale: DEFAULT_LOCALE }
}

/**
 * Has this field been filled in?
 *
 * Whitespace counts as blank, not just `''`. A field someone tabbed through and
 * left with a stray space in it is the same editorial accident as one left
 * empty, and treating the two differently is what made `content/site-settings.ts`
 * re-test every value with `.trim()` after asking here.
 *
 * The value itself is never trimmed — only the test is. `pickLocalized` is
 * generic and localized fields are not all strings: a rich-text body arrives as
 * an object, and the only thing that can be blank about it is being absent.
 */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  return typeof value === 'string' && value.trim() === ''
}

/**
 * The one decision behind the fallback strip.
 *
 * A page is "in" the locale that was asked for only when every piece of its
 * content is — one untranslated field is enough to say so, because a page of
 * half-Icelandic copy needs the explanation as much as an entirely Icelandic
 * one. Otherwise the page reports Icelandic, the language the fallback is in.
 *
 * Every page that renders localized content resolves its strip through here, so
 * "when does the note show" is answered once rather than per page.
 */
export function resolveContentLocale(
  fieldLocales: readonly Locale[],
  pageLocale: Locale,
): Locale {
  return fieldLocales.every((l) => l === pageLocale) ? pageLocale : DEFAULT_LOCALE
}
