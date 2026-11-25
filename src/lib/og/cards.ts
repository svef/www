import { accountCopy } from '@/components/AccountForms/copy'
import { getDictionary, localePath, type Locale } from '@/lib/i18n'
import type { RouteKey } from '@/lib/i18n/routes'
import type { ArtworkName } from '@/lib/stickers/artwork'
import { STICKER_PLACEMENTS, type StickerPage } from '@/lib/stickers/placements'

/**
 * The Open Graph cards: one per public page pair, keyed on the page's directory under
 * `src/app/(app)/[locale]/` (`forsida` is the front page, as in the sticker data).
 *
 * The signed-in portal (`minar-sidur`) and the admin (`stjornbord`) are left out on purpose:
 * they are about one signed-in person, are never indexed, and a link to one shared in a chat
 * should not dress up as a public page. Their root layout sets no `openGraph`, and this type
 * makes it impossible to give them a card by accident.
 */
export type CardKey =
  | 'forsida'
  // The two forms are called the same in both languages, so they have no entry in the
  // route map.
  | 'abendingar'
  | 'erindi'
  | Exclude<RouteKey, 'minar-sidur' | 'stjornbord'>

interface CardSpec {
  /** The headline, one entry per line. The front page breaks it as the hero does. */
  lines: (locale: Locale) => readonly string[]
  /**
   * Whose stickers the card borrows: the same `stickers` the page passes its `PageHead`.
   * The card shows the first artwork sticker of that page, in its own colours (the card is
   * dark, so nothing needs recolouring).
   */
  stickers?: StickerPage
}

const t = getDictionary
const title = (pick: (locale: Locale) => string) => (locale: Locale) => [pick(locale)]

export const CARDS: Readonly<Record<CardKey, CardSpec>> = {
  forsida: { lines: (l) => t(l).home.heroLines, stickers: 'forsida' },
  vidburdir: { lines: title((l) => t(l).events.title), stickers: 'vidburdir' },
  frettir: { lines: title((l) => t(l).news.title), stickers: 'frettir' },
  'um-svef': { lines: title((l) => t(l).about.title), stickers: 'um-svef' },
  stjorn: { lines: title((l) => t(l).about.boardTitle), stickers: 'stjorn' },
  'log-svef': { lines: title((l) => t(l).about.bylawsTitle) },
  'spurt-og-svarad': {
    lines: title((l) => t(l).about.faqTitle),
    stickers: 'spurt-og-svarad',
  },
  myndir: { lines: title((l) => t(l).photos.title) },
  'hafa-samband': { lines: title((l) => t(l).nav.contact), stickers: 'hafa-samband' },
  innsendingar: { lines: title((l) => t(l).submissions.title) },
  abendingar: { lines: title((l) => t(l).forms.feedback.title) },
  erindi: { lines: title((l) => t(l).forms.talk.title), stickers: 'erindi' },
  // On hold (#128) and answering 404 for now; the cards exist so un-hiding a page is still
  // the one-line change `HIDDEN_PAGES` promises.
  vefverdlaunin: { lines: title((l) => t(l).awards.title), stickers: 'vefverdlaunin' },
  skraning: { lines: title((l) => t(l).membership.title), stickers: 'skraning' },
  // The account pages wear the contact page's sticker, as their `PageHead`s do.
  nyskraning: {
    lines: title((l) => accountCopy[l].signUp.title),
    stickers: 'hafa-samband',
  },
  innskraning: {
    lines: title((l) => accountCopy[l].signIn.title),
    stickers: 'hafa-samband',
  },
  'gleymt-lykilord': {
    lines: title((l) => accountCopy[l].forgot.title),
    stickers: 'hafa-samband',
  },
  'endurstilla-lykilord': {
    lines: title((l) => accountCopy[l].reset.title),
    stickers: 'hafa-samband',
  },
  'stadfesta-netfang': {
    lines: title((l) => accountCopy[l].verify.title),
    stickers: 'hafa-samband',
  },
}

/** Facebook, LinkedIn, Slack and X all treat 1200×630 as the large-card size. */
export const OG_SIZE = { width: 1200, height: 630 } as const

export const CARD_KEYS = Object.keys(CARDS) as CardKey[]

export function isCardKey(value: string): value is CardKey {
  return Object.hasOwn(CARDS, value)
}

/** The card's public URL. It has a dot in it, which is what keeps `src/proxy.ts` off it. */
export function cardUrl(key: CardKey, locale: Locale): string {
  return `/og/${locale}/${key}.png`
}

/** The page the card belongs to, as its visible URL (`/en/events`). */
export function cardPagePath(key: CardKey, locale: Locale): string {
  return key === 'forsida' ? `/${locale}` : localePath(`/${key}`, locale)
}

/** What the card draws: its headline and the sticker it borrows, if any. */
export function cardContent(
  key: CardKey,
  locale: Locale,
): { lines: readonly string[]; sticker?: { art: ArtworkName; rotate: number } } {
  const spec = CARDS[key]
  const placed = spec.stickers
    ? STICKER_PLACEMENTS.find((s) => s.page === spec.stickers && s.kind === 'artwork')
    : undefined
  return {
    lines: spec.lines(locale),
    sticker:
      placed?.kind === 'artwork' ? { art: placed.art, rotate: placed.rotate } : undefined,
  }
}
