import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { Locale } from '@/lib/i18n'
import type { AwardCategory, AwardEdition, AwardWinner, AwardsPage, Media } from '@/payload-types'

/**
 * Shaping the awards documents into what `/vefverdlaunin` renders.
 *
 * Pure, for the same reasons as `./galleries-mapping.ts`: `./awards.ts` owns the
 * Payload reads and calls in here, so the re-typing a `locale: 'all'` read forces
 * — Payload's generated types describe the resolved single-locale shape — happens
 * once per collection, and the decisions below (which edition is "the ceremony",
 * which years are "the archive", what an edition with nothing in it looks like)
 * can be unit tested without a database.
 */

type MediaAllLocales = Omit<Media, 'alt' | 'caption'> & {
  alt: AllLocales<string>
  caption: AllLocales<string>
}

/** An `award-categories` document as a `locale: 'all'` read actually returns it. */
export type AwardCategoryAllLocales = Omit<AwardCategory, 'name'> & {
  name: AllLocales<string>
}

/** An `award-editions` document as a `locale: 'all'` read actually returns it. */
export type AwardEditionAllLocales = Omit<AwardEdition, 'headline'> & {
  headline: AllLocales<string>
}

/**
 * An `award-winners` document as a `locale: 'all'` read actually returns it.
 *
 * Only the relationships change shape. `siteName` and `blurb` are not localized
 * fields — the winners archive is published in Icelandic only by decision
 * (CLAUDE.md), so there is no English column for them to come back in.
 */
export type AwardWinnerAllLocales = Omit<
  AwardWinner,
  'edition' | 'category' | 'screenshot'
> & {
  edition: number | AwardEditionAllLocales
  category: number | AwardCategoryAllLocales
  screenshot?: number | MediaAllLocales | null
}

/** An `awards-page` global as a `locale: 'all'` read actually returns it. */
export type AwardsPageAllLocales = Omit<AwardsPage, 'intro'> & {
  intro: AllLocales<AwardsPage['intro']>
}

export type AwardCategoryView = {
  id: number
  /** Category name, resolved for the reader's locale. */
  name: string
  /** The language `name` is actually written in, for `lang` on the cell. */
  nameLocale: Locale
}

export type WinnerScreenshotView = {
  url: string
  /**
   * The Media document's own alt text, or `''` when it has none.
   *
   * Empty is the normal case and is correct: the card names the site right below
   * the screenshot, so alt text repeating the domain would have a screen reader
   * say it twice and describe nothing.
   */
  alt: string
  width: number | null
  height: number | null
}

export type AwardWinnerView = {
  id: number
  /** The winning site, written as its domain — "nafn.is". */
  siteName: string
  /** The awards year, taken from the related edition. */
  year: number
  category: string
  /** The language `category` is written in. The blurb is always Icelandic. */
  categoryLocale: Locale
  /** The jury's note. Null for most historical winners — see `./awards.ts`. */
  blurb: string | null
  url: string | null
  screenshot: WinnerScreenshotView | null
}

/** One year of the archive: the year, and whatever has been recorded for it. */
export type AwardYearView = {
  year: number
  winners: AwardWinnerView[]
}

export type CeremonyView = {
  year: number
  /**
   * The block's heading as an editor wrote it — "14. nóvember í Hörpu" — or null
   * when none has been written. The page composes a heading from the date and
   * venue in that case: the phrase declines the venue name in Icelandic
   * ("Harpa" → "í Hörpu"), which is why it is written rather than derived.
   */
  headline: string | null
  /** The language `headline` is written in. Meaningless when it is null. */
  headlineLocale: Locale
  /** ISO instant of the ceremony, for `<time dateTime>`. */
  ceremonyDate: string
  venue: string | null
  /** ISO instant, or null when the deadline has not been set. */
  submissionDeadline: string | null
  submissionUrl: string | null
  /** ISO instant, or null when the on-sale date has not been set. */
  ticketsOnSaleFrom: string | null
  ticketUrl: string | null
}

export function toCategory(doc: AwardCategoryAllLocales, locale: Locale): AwardCategoryView {
  const name = pickLocalized(doc.name, locale)
  return { id: doc.id, name: name.value ?? '', nameLocale: name.locale }
}

function toScreenshot(
  screenshot: AwardWinnerAllLocales['screenshot'],
  locale: Locale,
): WinnerScreenshotView | null {
  // depth 0 (or an unresolved relationship) leaves an id behind — nothing to render.
  if (!screenshot || typeof screenshot === 'number') return null
  if (!screenshot.url) return null
  return {
    url: screenshot.url,
    alt: pickLocalized(screenshot.alt, locale).value ?? '',
    width: screenshot.width ?? null,
    height: screenshot.height ?? null,
  }
}

/**
 * One winner, or null when its edition or category did not resolve.
 *
 * Both are required relationships, so an unresolved one means the read asked for
 * too little depth rather than that an editor left something out. A card with no
 * year and no category would be a card that says almost nothing, so the row is
 * dropped instead of rendered half-built.
 */
export function toWinner(
  doc: AwardWinnerAllLocales,
  locale: Locale,
): AwardWinnerView | null {
  if (typeof doc.edition === 'number' || typeof doc.category === 'number') return null
  const category = pickLocalized(doc.category.name, locale)
  return {
    id: doc.id,
    siteName: doc.siteName,
    year: doc.edition.year,
    category: category.value ?? '',
    categoryLocale: category.locale,
    blurb: doc.blurb ?? null,
    url: doc.url ?? null,
    screenshot: toScreenshot(doc.screenshot, locale),
  }
}

/**
 * The edition the ceremony block is about: the most recent one that has a date.
 *
 * Deliberately *not* "the next ceremony in the future". The page is prerendered
 * and revalidated every five minutes, so "in the future" would be evaluated when
 * the page was last rendered rather than when it is read (CLAUDE.md, "`revalidate`
 * is a staleness floor"), and on the day after a ceremony the block would keep
 * inviting people to an event that has happened — or vanish mid-afternoon,
 * depending on which side of the window the reader landed. The latest dated
 * edition is the same answer all year and changes exactly when the board creates
 * next year's edition, which is the moment they mean it to change.
 */
export function pickCeremonyEdition(
  editions: readonly AwardEditionAllLocales[],
): AwardEditionAllLocales | null {
  const dated = editions.filter((edition) => Boolean(edition.ceremonyDate))
  if (dated.length === 0) return null
  return dated.reduce((latest, edition) => (edition.year > latest.year ? edition : latest))
}

export function toCeremony(doc: AwardEditionAllLocales, locale: Locale): CeremonyView | null {
  if (!doc.ceremonyDate) return null
  const headline = pickLocalized(doc.headline, locale)
  return {
    year: doc.year,
    headline: headline.value ?? null,
    headlineLocale: headline.locale,
    ceremonyDate: doc.ceremonyDate,
    venue: doc.venue ?? null,
    submissionDeadline: doc.submissionDeadline ?? null,
    submissionUrl: doc.submissionUrl ?? null,
    ticketsOnSaleFrom: doc.ticketsOnSaleFrom ?? null,
    ticketUrl: doc.ticketUrl ?? null,
  }
}

/**
 * The archive: every edition except the one the ceremony block is about, newest
 * first, each with the winners recorded for it.
 *
 * Excluding the featured edition is the whole rule. The upcoming ceremony has no
 * winners because they have not been chosen yet, and an archive tab for it would
 * say "nothing recorded for 2026" directly below a block announcing that the 2026
 * ceremony is in November — which reads as missing data rather than as a year
 * that has not happened. The design's tabs stop at 2025 for the same reason.
 *
 * Years with no winners are kept. 2020–2024 exist as editions and are genuinely
 * empty until the historical import (svef/www#31, blocked on svef/Skjalasafn#1)
 * lands; dropping them would quietly shorten the association's history to one
 * year, which is a bigger lie than an empty tab.
 */
export function toArchive(
  editions: readonly AwardEditionAllLocales[],
  winners: readonly AwardWinnerView[],
  featuredYear: number | null,
): AwardYearView[] {
  return editions
    .filter((edition) => edition.year !== featuredYear)
    .map((edition) => edition.year)
    .sort((a, b) => b - a)
    .map((year) => ({ year, winners: winners.filter((winner) => winner.year === year) }))
}
