// @vitest-environment node
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/lib/i18n'
import { CARD_KEYS, cardContent, cardPagePath, cardUrl, isCardKey } from './cards'
import { cardMetadata, socialMetadata } from './metadata'

const app = join(process.cwd(), 'src/app')
/** The page directories directly under a route group's `[locale]`, dynamic ones left out. */
const pagesIn = (group: string) =>
  readdirSync(join(app, group, '[locale]'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('['))
    .map((d) => d.name)

describe('which pages have a card', () => {
  it('gives every public page one, and the front page', () => {
    for (const page of pagesIn('(app)')) expect(isCardKey(page), page).toBe(true)
    expect(isCardKey('forsida')).toBe(true)
  })

  it('gives none to the signed-in portal or the admin', () => {
    const portal = pagesIn('(portal)')
    expect(portal).toEqual(expect.arrayContaining(['minar-sidur', 'stjornbord']))
    for (const page of portal) expect(isCardKey(page), page).toBe(false)
  })

  it('has a headline for every card in both languages', () => {
    for (const key of CARD_KEYS) {
      for (const locale of LOCALES) {
        const { lines } = cardContent(key, locale)
        expect(lines.length, `${locale} ${key}`).toBeGreaterThan(0)
        for (const line of lines) expect(line.trim(), `${locale} ${key}`).not.toBe('')
      }
    }
  })

  it('names the page in the reader’s language', () => {
    expect(cardPagePath('vidburdir', 'en')).toBe('/en/events')
    expect(cardPagePath('vidburdir', 'is')).toBe('/is/vidburdir')
    expect(cardPagePath('forsida', 'en')).toBe('/en')
  })
})

/**
 * The card URL must reach the route handler untouched in both states of `LANDING_ONLY`: the
 * first attempt at this (the `opengraph-image` convention, under `/landing/<locale>/`) was
 * redirected away by the proxy, and every shared link previewed blank. What keeps the proxy
 * off it is the matcher, which skips any path with a dot in it.
 */
describe('the proxy leaves the cards alone', () => {
  afterEach(() => vi.doUnmock('@/lib/site-mode'))

  for (const landingOnly of [true, false]) {
    it(`does not match a card URL (LANDING_ONLY=${landingOnly})`, async () => {
      vi.resetModules()
      vi.doMock('@/lib/site-mode', () => ({ LANDING_ONLY: landingOnly }))
      const { config } = await import('@/proxy')
      const matchers = config.matcher.map((m) => new RegExp(`^${m}$`))
      const matched = (path: string) => matchers.some((m) => m.test(path))

      // The matcher is read the way Next reads it: a page is matched…
      expect(matched('/en/events')).toBe(true)
      // …and no card is.
      for (const locale of LOCALES) {
        for (const key of CARD_KEYS)
          expect(matched(cardUrl(key, locale)), key).toBe(false)
      }
    })
  }
})

describe('the metadata', () => {
  it('points the preview at the card, at its real size', () => {
    const { openGraph, twitter } = socialMetadata({
      locale: 'en',
      card: 'frettir',
      title: 'News',
    })
    expect(openGraph).toMatchObject({
      title: 'News | SVEF',
      locale: 'en_GB',
      images: [{ url: '/og/en/frettir.png', width: 1200, height: 630 }],
    })
    expect(twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('uses a picture of the page’s own instead when it has one', () => {
    const { openGraph } = socialMetadata({
      locale: 'is',
      card: 'frettir',
      image: { url: '/api/media/file/a.jpg', alt: '', width: 1600, height: 900 },
    })
    expect(openGraph?.images).toEqual([
      {
        url: '/api/media/file/a.jpg',
        alt: 'SVEF — Samtök vefiðnaðarins',
        width: 1600,
        height: 900,
      },
    ])
  })

  it('gives a fixed page its own title, URL and card', async () => {
    const meta = await cardMetadata('vidburdir')({
      params: Promise.resolve({ locale: 'en' }),
    })
    expect(meta.title).toBe('Events')
    expect(meta.openGraph).toMatchObject({
      url: '/en/events',
      images: [{ url: '/og/en/vidburdir.png' }],
    })
  })
})
