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
 * An empty string counts as missing: Payload writes `''` for a localized text
 * field that was opened in the admin and left blank.
 */
export function pickLocalized<T>(
  field: AllLocales<T>,
  locale: Locale,
): Localized<T | null> {
  const own = field?.[locale]
  if (own !== null && own !== undefined && own !== '') return { value: own, locale }
  return { value: field?.[DEFAULT_LOCALE] ?? null, locale: DEFAULT_LOCALE }
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
