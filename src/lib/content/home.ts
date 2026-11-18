import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import { getDictionary, type Locale } from '@/lib/i18n'
import { getCeremony } from './awards'
import {
  toAwardsMeta,
  toHomeSettings,
  type HomeFallbacks,
  type HomePageAllLocales,
  type HomeSettings,
} from './home-mapping'

/**
 * Reading the home page's copy.
 *
 * The page reads two sources: the `home-page` global for the copy and whether the events
 * section shows, and `events` (through `./events`) for the posters. A section the global
 * turns off costs no query at all.
 */

export type { Copy, HomeFallbacks, HomeSettings } from './home-mapping'

/** How many posters the events zig-zag draws, at most (the export's grid holds four). */
export const HOME_EVENT_COUNT = 4

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
    heroLines: c.heroLines,
    primaryLabel: c.joinCta,
    secondaryLabel: c.eventsCta,
    intro: c.intro,
    eventsHeading: c.eventsTitle,
    eventsLead: c.eventsLead,
    eventsLinkLabel: c.allEvents,
    aboutHeading: c.aboutTitle,
    aboutText: c.aboutText,
    aboutLinkLabel: c.moreAbout,
  }
  return toHomeSettings(doc, locale, fallbacks)
})

/**
 * The date · venue line of the Web Awards section: the ceremony the awards page announces
 * when the CMS has one, else the export's own line.
 */
export const getAwardsMeta = cache(async function getAwardsMeta(locale: Locale): Promise<string> {
  const ceremony = await getCeremony(locale)
  return toAwardsMeta(ceremony, locale, getDictionary(locale).home.awardsMeta)
})
