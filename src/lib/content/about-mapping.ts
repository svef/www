import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { Locale } from '@/lib/i18n'
import type { AboutPage, BoardMember, Media } from '@/payload-types'

/**
 * Shaping the About page's documents into what the page renders.
 *
 * Pure, for the same reasons as `./news-mapping.ts`: `./about.ts` owns the
 * Payload reads and calls in here, so the fallback logic — which is a decision,
 * not a lookup — can be unit tested without a database. See that file's header
 * for the full argument; this one only notes where About differs.
 */

type MediaAllLocales = Omit<Media, 'alt' | 'caption'> & {
  alt: AllLocales<string>
  caption: AllLocales<string>
}

/** A `board-members` document as a `locale: 'all'` read actually returns it. */
export type BoardMemberAllLocales = Omit<BoardMember, 'role' | 'bio' | 'photo'> & {
  role: AllLocales<string>
  bio: AllLocales<string>
  photo?: number | MediaAllLocales | null
}

/** An `about-page` global as a `locale: 'all'` read actually returns it. */
export type AboutPageAllLocales = Omit<AboutPage, 'story' | 'boardIntro' | 'faq' | 'brandAssets'> & {
  story: AllLocales<AboutPage['story']>
  boardIntro: AllLocales<string>
  faq?:
    | { question: AllLocales<string>; answer: AllLocales<string>; id?: string | null }[]
    | null
  brandAssets?: { label: string; file: number | MediaAllLocales; id?: string | null }[] | null
}

export type BoardPortrait = {
  url: string
  /**
   * Empty unless the Media document carries its own alt text.
   *
   * The card names the person in its caption, right next to the portrait, so a
   * generated "Portrait of X" would have a screen reader say the name twice and
   * describe nothing. An editor who writes real alt text is saying something the
   * caption does not, and that is what gets announced.
   */
  alt: string
  width: number | null
  height: number | null
}

export type BoardMemberView = {
  name: string
  /** Role and area, e.g. "Meðstjórnandi · hönnun". Empty when unset in the CMS. */
  role: string
  company: string | null
  portrait: BoardPortrait | null
  /** The language `role` is actually written in, for `lang` on the card. */
  roleLocale: Locale
}

export type FaqItemView = {
  question: string
  answer: string
  questionLocale: Locale
  answerLocale: Locale
}

export type PressLinkView = {
  title: string
  outlet: string
  /** `null` for a mention with no usable link; the page renders it unlinked. */
  url: string | null
}

export type BrandAssetView = {
  label: string
  url: string
  /**
   * Bytes as Payload recorded them, or `null` when it did not.
   *
   * The page prints this beside the download label, so someone on a phone can
   * see what a logo pack costs before tapping it. The export's buttons carry no
   * size, so this is an addition to the design rather than a transcription of it.
   */
  filesize: number | null
}

export type AboutContent = {
  story: AboutPage['story'] | null
  storyLocale: Locale
  faq: FaqItemView[]
  press: PressLinkView[]
  brandAssets: BrandAssetView[]
}

function toPortrait(
  photo: BoardMemberAllLocales['photo'],
  locale: Locale,
): BoardPortrait | null {
  // depth 0 (or an unresolved relationship) leaves an id behind — nothing to render.
  if (!photo || typeof photo === 'number') return null
  if (!photo.url) return null
  return {
    url: photo.url,
    alt: pickLocalized(photo.alt, locale).value ?? '',
    width: photo.width ?? null,
    height: photo.height ?? null,
  }
}

export function toBoardMember(doc: BoardMemberAllLocales, locale: Locale): BoardMemberView {
  const role = pickLocalized(doc.role, locale)
  return {
    name: doc.name,
    role: role.value ?? '',
    company: doc.company ?? null,
    portrait: toPortrait(doc.photo, locale),
    roleLocale: role.locale,
  }
}

function toFaqItem(
  row: NonNullable<AboutPageAllLocales['faq']>[number],
  locale: Locale,
): FaqItemView {
  const question = pickLocalized(row.question, locale)
  const answer = pickLocalized(row.answer, locale)
  return {
    question: question.value ?? '',
    answer: answer.value ?? '',
    questionLocale: question.locale,
    // With no answer there is nothing to mark, so it follows the question.
    answerLocale: answer.value ? answer.locale : question.locale,
  }
}

/**
 * Press rows, dropping anything with nothing to show.
 *
 * `url` is optional in the model, so an empty string from an admin field that
 * was opened and left blank has to become `null` rather than an `href=""` that
 * reloads the page.
 */
function toPressLink(
  row: NonNullable<AboutPage['press']>[number],
): PressLinkView {
  const url = row.url?.trim()
  return { title: row.title, outlet: row.outlet, url: url ? url : null }
}

/**
 * Brand assets, dropping rows whose upload has not resolved.
 *
 * `file` is a required upload, so a row without a usable URL means the media
 * document is gone or the read came back at depth 0 — either way there is no
 * file to download and a button pointing at nothing is worse than no button.
 */
function toBrandAsset(
  row: NonNullable<AboutPageAllLocales['brandAssets']>[number],
): BrandAssetView | null {
  const file = row.file
  if (!file || typeof file === 'number' || !file.url) return null
  return {
    label: row.label,
    url: file.url,
    filesize: file.filesize ?? null,
  }
}

export function toAboutContent(doc: AboutPageAllLocales, locale: Locale): AboutContent {
  const story = pickLocalized(doc.story, locale)
  return {
    story: story.value ?? null,
    storyLocale: story.locale,
    faq: (doc.faq ?? []).map((row) => toFaqItem(row, locale)),
    press: (doc.press ?? []).map(toPressLink),
    brandAssets: (doc.brandAssets ?? [])
      .map(toBrandAsset)
      .filter((asset): asset is BrandAssetView => asset !== null),
  }
}
