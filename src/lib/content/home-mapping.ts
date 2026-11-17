import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { HomePage } from '@/payload-types'

/**
 * Shaping the `home-page` global.
 *
 * Pure, for the same reasons as `./awards-mapping.ts`: `./home.ts` owns the Payload read
 * and calls in here, so the re-typing a `locale: 'all'` read forces happens in one place
 * and what an unsaved global means is unit tested without a database.
 */

type Group<T> = { [K in keyof T]?: AllLocales<string> } | null | undefined

/** The `home-page` global as a `locale: 'all'` read actually returns it. */
export type HomePageAllLocales = Omit<
  HomePage,
  | 'heroSentence'
  | 'heroLines'
  | 'heroPrimaryLabel'
  | 'heroSecondaryLabel'
  | 'introBand'
  | 'eventsSection'
  | 'newsSection'
  | 'aboutSection'
> & {
  heroSentence?: AllLocales<string>
  heroLines?: Partial<Record<Locale, { id?: string | null; text: string }[] | null>> | null
  heroPrimaryLabel?: AllLocales<string>
  heroSecondaryLabel?: AllLocales<string>
  introBand?: Group<{ text: string }>
  eventsSection?: Group<{ heading: string; lead: string; linkLabel: string }>
  newsSection?: Group<{ heading: string; linkLabel: string }>
  aboutSection?: Group<{ heading: string; text: string; linkLabel: string }>
}

/** A piece of copy and the language it is written in. */
export type Copy = {
  text: string
  /** `lang` for the element, or undefined when it is the page's own language. */
  lang: Locale | undefined
  locale: Locale
}

/** Interface strings the page falls back to for copy an editor has not written. */
export type HomeFallbacks = {
  title: string
  primaryLabel: string
  secondaryLabel: string
  eventsHeading: string
  eventsLinkLabel: string
  newsHeading: string
  newsLinkLabel: string
  aboutHeading: string
  aboutLinkLabel: string
}

export type HomeSettings = {
  /** The headline, one entry per line. Never empty: ends at the fallback title. */
  heroLines: string[]
  /** The language the headline is written in. */
  heroLocale: Locale
  primaryLabel: Copy
  secondaryLabel: Copy
  /** The statement in the intro band, or null: the band then does not render. */
  introText: Copy | null
  showUpcomingEvents: boolean
  eventsHeading: Copy
  eventsLead: Copy | null
  eventsLinkLabel: Copy
  showLatestNews: boolean
  newsHeading: Copy
  newsLinkLabel: Copy
  aboutHeading: Copy
  aboutText: Copy | null
  aboutLinkLabel: Copy
  /** Every language the copy above is actually in, for the translation note. */
  locales: Locale[]
}

function toCopy(
  field: AllLocales<string>,
  locale: Locale,
  fallback: string | null,
): Copy | null {
  const picked = pickLocalized(field, locale)
  if (picked.value !== null) {
    return {
      text: picked.value,
      locale: picked.locale,
      lang: picked.locale === locale ? undefined : picked.locale,
    }
  }
  // An interface string: written in the page's own language by definition.
  return fallback === null ? null : { text: fallback, locale, lang: undefined }
}

/**
 * Hero lines for a locale: the locale's own rows, else Icelandic's, else the one-sentence
 * field, else the association's name. A row that is blank is dropped.
 */
function toHeroLines(
  doc: HomePageAllLocales,
  locale: Locale,
  fallbackTitle: string,
): { lines: string[]; locale: Locale } {
  const rows = (l: Locale) =>
    (doc.heroLines?.[l] ?? []).map((r) => r.text.trim()).filter(Boolean)
  const own = rows(locale)
  if (own.length > 0) return { lines: own, locale }
  const is = rows(DEFAULT_LOCALE)
  if (is.length > 0) return { lines: is, locale: DEFAULT_LOCALE }
  const sentence = pickLocalized(doc.heroSentence, locale)
  if (sentence.value !== null) return { lines: [sentence.value], locale: sentence.locale }
  return { lines: [fallbackTitle], locale }
}

/**
 * The global's defaults, applied here rather than trusted from Payload.
 *
 * `defaultValue` on a global field applies when a document is *created*, so a `home-page`
 * that no editor has ever opened comes back almost empty and every flag reads `undefined`.
 * Showing a section is the default and hiding one is the deliberate act.
 */
export function toHomeSettings(
  doc: HomePageAllLocales,
  locale: Locale,
  fb: HomeFallbacks,
): HomeSettings {
  const hero = toHeroLines(doc, locale, fb.title)
  const need = (field: AllLocales<string>, fallback: string) =>
    toCopy(field, locale, fallback) as Copy

  const settings = {
    heroLines: hero.lines,
    heroLocale: hero.locale,
    primaryLabel: need(doc.heroPrimaryLabel, fb.primaryLabel),
    secondaryLabel: need(doc.heroSecondaryLabel, fb.secondaryLabel),
    introText: toCopy(doc.introBand?.text, locale, null),
    showUpcomingEvents: doc.showUpcomingEvents ?? true,
    eventsHeading: need(doc.eventsSection?.heading, fb.eventsHeading),
    eventsLead: toCopy(doc.eventsSection?.lead, locale, null),
    eventsLinkLabel: need(doc.eventsSection?.linkLabel, fb.eventsLinkLabel),
    showLatestNews: doc.showLatestNews ?? true,
    newsHeading: need(doc.newsSection?.heading, fb.newsHeading),
    newsLinkLabel: need(doc.newsSection?.linkLabel, fb.newsLinkLabel),
    aboutHeading: need(doc.aboutSection?.heading, fb.aboutHeading),
    aboutText: toCopy(doc.aboutSection?.text, locale, null),
    aboutLinkLabel: need(doc.aboutSection?.linkLabel, fb.aboutLinkLabel),
  }

  const copies = [
    settings.primaryLabel,
    settings.secondaryLabel,
    settings.introText,
    settings.eventsHeading,
    settings.eventsLead,
    settings.eventsLinkLabel,
    settings.newsHeading,
    settings.newsLinkLabel,
    settings.aboutHeading,
    settings.aboutText,
    settings.aboutLinkLabel,
  ]
  return {
    ...settings,
    locales: [
      hero.locale,
      ...copies.flatMap((c) => (c ? [c.locale] : [])),
    ],
  }
}
