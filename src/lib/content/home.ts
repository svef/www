import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import { getDictionary, type Locale } from '@/lib/i18n'
import {
  toHomeSettings,
  type HomeFallbacks,
  type HomePageAllLocales,
  type HomeSettings,
} from './home-mapping'

/**
 * Reading the home page's copy.
 *
 * The page is a shop window onto three sources — the `home-page` global for the copy and
 * which sections show, `events` for the next ones and `news` for the latest — so each has
 * its own read: the events and news come from `./events` and `./news`, and a section the
 * global turns off then costs no query at all.
 */

export type { Copy, HomeFallbacks, HomeSettings } from './home-mapping'

/** How many posters the events carousel draws, at most. */
export const HOME_EVENT_COUNT = 6

/** How many news cards the home page shows. */
export const HOME_NEWS_COUNT = 3

/**
 * The copy on the home page, resolved for a locale.
 *
 * What an editor has not written falls back to the interface dictionary (`t.home`).
 * Cached per request so the page body and a future `generateMetadata` can each ask without
 * a second round trip. `depth: 0`: nothing on the global is a relationship that the page
 * still reads.
 */
export const getHomeSettings = cache(async function getHomeSettings(
  locale: Locale,
): Promise<HomeSettings> {
  const payload = await getPayload()
  const doc = (await payload.findGlobal({
    slug: 'home-page',
    ...publicReadArgs,
    depth: 0,
  })) as unknown as HomePageAllLocales
  const c = getDictionary(locale).home
  const fallbacks: HomeFallbacks = {
    title: c.fallbackTitle,
    primaryLabel: c.joinCta,
    secondaryLabel: c.eventsCta,
    eventsHeading: c.eventsTitle,
    eventsLinkLabel: c.allEvents,
    newsHeading: c.newsTitle,
    newsLinkLabel: c.allNews,
    aboutHeading: c.aboutTitle,
    aboutLinkLabel: c.moreAbout,
  }
  return toHomeSettings(doc, locale, fallbacks)
})
