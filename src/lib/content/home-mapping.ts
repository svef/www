import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { HomePage } from '@/payload-types'

/**
 * Shaping the `home-page` global.
 *
 * Pure, for the same reasons as `./awards-mapping.ts`: `./home.ts` owns the Payload read
 * and calls in here, so the re-typing a `locale: 'all'` read forces happens in one place
 * and what an unsaved global means is unit tested without a database.
 *
 * Every piece of copy falls back to the dictionary, which carries the export's own copy:
 * a global nobody has filled in (production, for now) shows the page as designed.
 */

type Group<T> = { [K in keyof T]?: AllLocales<string> } | null | undefined

/** The `home-page` global as a `locale: 'all'` read actually returns it. */
export type HomePageAllLocales = Omit<
  HomePage,
  | 'heroLines'
  | 'heroPrimaryLabel'
  | 'heroSecondaryLabel'
  | 'introBand'
  | 'eventsSection'
  | 'aboutSection'
> & {
  heroLines?: Partial<Record<Locale, { id?: string | null; text: string }[] | null>> | null
  heroPrimaryLabel?: AllLocales<string>
  heroSecondaryLabel?: AllLocales<string>
  introBand?: Group<{ text: string }>
  eventsSection?: Group<{ heading: string; lead: string; linkLabel: string }>
  aboutSection?: Group<{ heading: string; text: string; linkLabel: string }>
}

/** A piece of copy and the language it is written in. */
export type Copy = {
  text: string
  /** `lang` for the element, or undefined when it is the page's own language. */
  lang: Locale | undefined
  locale: Locale
}

/** The dictionary's copy (`t.home`), for whatever an editor has not written. */
export type HomeFallbacks = {
  heroLines: readonly string[]
  primaryLabel: string
  secondaryLabel: string
  intro: string
  eventsHeading: string
  eventsLead: string
  eventsLinkLabel: string
  aboutHeading: string
  aboutText: string
  aboutLinkLabel: string
}

export type HomeSettings = {
  /** The headline, one entry per line. Never empty. */
  heroLines: string[]
  /** The language the headline is written in. */
  heroLocale: Locale
  primaryLabel: Copy
  secondaryLabel: Copy
  /** The statement in the intro band. */
  introText: Copy
  showUpcomingEvents: boolean
  eventsHeading: Copy
  eventsLead: Copy
  eventsLinkLabel: Copy
  aboutHeading: Copy
  aboutText: Copy
  aboutLinkLabel: Copy
  /** Every language the copy above is actually in, for the translation note. */
  locales: Locale[]
}

function toCopy(field: AllLocales<string>, locale: Locale, fallback: string): Copy {
  const picked = pickLocalized(field, locale)
  if (picked.value !== null) {
    return {
      text: picked.value,
      locale: picked.locale,
      lang: picked.locale === locale ? undefined : picked.locale,
    }
  }
  // The dictionary's copy: written in the page's own language by definition.
  return { text: fallback, locale, lang: undefined }
}

/**
 * Hero lines for a locale: the locale's own rows, else Icelandic's, else the dictionary's.
 * A row that is blank is dropped.
 *
 * The old one-sentence `heroSentence` is deliberately not in the chain: the headline is
 * set on separate lines, and one long line is what ran off the screen (#129).
 */
function toHeroLines(
  doc: HomePageAllLocales,
  locale: Locale,
  fallback: readonly string[],
): { lines: string[]; locale: Locale } {
  const rows = (l: Locale) =>
    (doc.heroLines?.[l] ?? []).map((r) => r.text.trim()).filter(Boolean)
  const own = rows(locale)
  if (own.length > 0) return { lines: own, locale }
  const is = rows(DEFAULT_LOCALE)
  if (is.length > 0) return { lines: is, locale: DEFAULT_LOCALE }
  return { lines: [...fallback], locale }
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
  const hero = toHeroLines(doc, locale, fb.heroLines)
  const copy = (field: AllLocales<string>, fallback: string) => toCopy(field, locale, fallback)

  const settings = {
    heroLines: hero.lines,
    heroLocale: hero.locale,
    primaryLabel: copy(doc.heroPrimaryLabel, fb.primaryLabel),
    secondaryLabel: copy(doc.heroSecondaryLabel, fb.secondaryLabel),
    introText: copy(doc.introBand?.text, fb.intro),
    showUpcomingEvents: doc.showUpcomingEvents ?? true,
    eventsHeading: copy(doc.eventsSection?.heading, fb.eventsHeading),
    eventsLead: copy(doc.eventsSection?.lead, fb.eventsLead),
    eventsLinkLabel: copy(doc.eventsSection?.linkLabel, fb.eventsLinkLabel),
    aboutHeading: copy(doc.aboutSection?.heading, fb.aboutHeading),
    aboutText: copy(doc.aboutSection?.text, fb.aboutText),
    aboutLinkLabel: copy(doc.aboutSection?.linkLabel, fb.aboutLinkLabel),
  }

  const copies = [
    settings.primaryLabel,
    settings.secondaryLabel,
    settings.introText,
    settings.eventsHeading,
    settings.eventsLead,
    settings.eventsLinkLabel,
    settings.aboutHeading,
    settings.aboutText,
    settings.aboutLinkLabel,
  ]
  return { ...settings, locales: [hero.locale, ...copies.map((c) => c.locale)] }
}
