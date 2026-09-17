import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { Locale } from '@/lib/i18n'
import type { AwardWinnerView } from './awards-mapping'
import type { GalleryAlbum, GalleryPhoto } from './galleries-mapping'
import type { HomePage } from '@/payload-types'

/**
 * Shaping the `home-page` global, and choosing what the home page shows.
 *
 * Pure, for the same reasons as `./awards-mapping.ts`: `./home.ts` owns the
 * Payload reads and calls in here, so the re-typing a `locale: 'all'` read
 * forces happens in one place, and the decisions below — what an unsaved global
 * means, which winners are "recent", which photos make the strip — are unit
 * tested without a database.
 */

/** The `home-page` global as a `locale: 'all'` read actually returns it. */
export type HomePageAllLocales = Omit<HomePage, 'heroSentence' | 'heroHook'> & {
  heroSentence: AllLocales<string>
  heroHook: AllLocales<string>
}

/** Which block the "Það sem er að gerast núna" slot shows, if any. */
export type SpotlightMode = 'nextEvent' | 'winner' | 'hidden'

export type HomeSettings = {
  /** The `<h1>`. Null when nobody has written one — see `toHomeSettings`. */
  heroSentence: string | null
  /** The language `heroSentence` is written in. Meaningless when it is null. */
  heroSentenceLocale: Locale
  /** The paragraph under the `<h1>`, or null. */
  heroHook: string | null
  heroHookLocale: Locale
  spotlightMode: SpotlightMode
  /**
   * The `award-winners` document the spotlight is about, when the mode is
   * `winner`. Null in every other mode, and when the mode is `winner` but no
   * winner has been picked — the page then draws no spotlight rather than an
   * empty panel.
   */
  spotlightWinnerId: number | null
  showUpcomingEvents: boolean
  showRecentWinners: boolean
  showPhotos: boolean
}

/**
 * The global's defaults, applied here rather than trusted from Payload.
 *
 * `defaultValue` on a global field is applied when a document is *created*, so
 * a `home-page` that no editor has ever opened comes back as an almost-empty
 * object and every `show*` flag reads `undefined`. Defaulting them to `false`
 * there would hide the whole page on a fresh database — a site that renders a
 * hero and nothing else, with no error anywhere to explain it. Showing a
 * section is therefore the default, and hiding one is the deliberate act.
 */
export function toHomeSettings(doc: HomePageAllLocales, locale: Locale): HomeSettings {
  const sentence = pickLocalized(doc.heroSentence, locale)
  const hook = pickLocalized(doc.heroHook, locale)
  const mode: SpotlightMode = doc.happeningNow?.mode ?? 'nextEvent'
  const winner = doc.happeningNow?.winner

  return {
    heroSentence: sentence.value ?? null,
    heroSentenceLocale: sentence.locale,
    heroHook: hook.value ?? null,
    heroHookLocale: hook.locale,
    spotlightMode: mode,
    spotlightWinnerId:
      mode === 'winner' ? (typeof winner === 'number' ? winner : (winner?.id ?? null)) : null,
    showUpcomingEvents: doc.showUpcomingEvents ?? true,
    showRecentWinners: doc.showRecentWinners ?? true,
    showPhotos: doc.showPhotos ?? true,
  }
}

/**
 * The winners the "Verðlaunavefir" strip shows: the most recent ones.
 *
 * Newest year first, and within a year by site name — the same ordering the
 * archive uses, because a year's winners are a set of equals rather than a
 * ranking, and an arbitrary order out of Postgres would reshuffle the strip on
 * every deploy.
 *
 * Sorting here rather than in the query is not a preference: the year lives on
 * the related `award-editions` document, so `sort: '-edition'` would order by
 * the relationship's row id — which is the order the editions happened to be
 * created in, not the order of the years.
 */
export function pickRecentWinners(
  winners: readonly AwardWinnerView[],
  limit: number,
): AwardWinnerView[] {
  return [...winners]
    .sort((a, b) => b.year - a.year || a.siteName.localeCompare(b.siteName, 'is'))
    .slice(0, limit)
}

/**
 * The photos in the home page's strip: the newest ones the site has.
 *
 * Taken across albums rather than from the newest album alone. An album is
 * created when an event happens and its photos are uploaded afterwards, so the
 * newest album is routinely the emptiest one — drawing the strip from it alone
 * would leave the home page showing one photo, or none, while a full album sat
 * directly below it in the same list.
 *
 * `albums` is expected newest-first, which is what `listGalleries` returns.
 */
export function recentPhotos(
  albums: readonly GalleryAlbum[],
  limit: number,
): GalleryPhoto[] {
  const photos: GalleryPhoto[] = []
  for (const album of albums) {
    for (const photo of album.photos) {
      if (photos.length === limit) return photos
      photos.push(photo)
    }
  }
  return photos
}

/** What the home page does with the upcoming events it was given. */
export type EventSectionPlan<T> = {
  /** The event the spotlight announces, or null when it shows something else. */
  spotlight: T | null
  /** The rows under "Næstu viðburðir". Empty unless `section` is `'list'`. */
  rows: T[]
  /**
   * Whether the section renders, and as what.
   *
   * - `'list'` — the heading and the rows.
   * - `'empty'` — the heading and "Engir viðburðir framundan".
   * - `'hidden'` — nothing at all.
   */
  section: 'list' | 'empty' | 'hidden'
}

/**
 * Split the upcoming events between the spotlight and the list.
 *
 * A decision rather than a lookup, so it lives here and is tested directly —
 * and this one earned that. The rule that matters is the third line: **the
 * empty state is about the calendar, not about the list.** With exactly one
 * event upcoming the spotlight takes it and the list is left with nothing, and
 * an earlier version drew "Engir viðburðir framundan" two blocks below a
 * spotlight announcing that very event. One event on the calendar is the
 * ordinary state for this association, and this is the front page.
 *
 * So: the empty state fires on `upcoming` being empty, and a list that has been
 * emptied by the spotlight drops the section instead of contradicting it.
 * `/vidburdir` makes the same distinction for the same reason.
 *
 * Generic in the event type because none of this reads a field — it is entirely
 * about how many there are and who took the first one.
 */
export function planEventSection<T>(
  upcoming: readonly T[],
  options: { spotlightNextEvent: boolean; showSection: boolean },
): EventSectionPlan<T> {
  const spotlight = options.spotlightNextEvent ? (upcoming[0] ?? null) : null
  if (!options.showSection) return { spotlight, rows: [], section: 'hidden' }
  if (upcoming.length === 0) return { spotlight, rows: [], section: 'empty' }

  const rows = spotlight === null ? [...upcoming] : upcoming.slice(1)
  return { spotlight, rows, section: rows.length > 0 ? 'list' : 'hidden' }
}
