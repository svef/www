import { describe, it, expect } from 'vitest'
import { toNewsArticle, toNewsSummary } from './news-mapping'

// Shaped like a `locale: 'all'` read: every localized field is an object keyed
// by locale, and English is absent until someone translates the document.
const doc = {
  id: 1,
  slug: 'ny-stjorn-er-tekin-vid',
  publishedAt: '2026-05-22T12:00:00.000Z',
  title: { is: 'Ný stjórn er tekin við', en: null },
  excerpt: { is: 'Ný stjórn SVEF tók við störfum á aðalfundi.', en: null },
  body: { is: null, en: null },
  coverImage: null,
  updatedAt: '2026-05-22T12:00:00.000Z',
  createdAt: '2026-05-22T12:00:00.000Z',
} as unknown as Parameters<typeof toNewsSummary>[0]

const translated = {
  ...doc,
  title: { is: 'Ný stjórn er tekin við', en: 'A new board takes over' },
  excerpt: { is: 'Ný stjórn SVEF tók við.', en: 'A new SVEF board took office.' },
} as unknown as Parameters<typeof toNewsSummary>[0]

describe('toNewsSummary', () => {
  it('links to the Icelandic article at the root', () => {
    expect(toNewsSummary(doc, 'is').href).toBe('/frettir/ny-stjorn-er-tekin-vid')
  })

  it('links to the English article under /en', () => {
    expect(toNewsSummary(doc, 'en').href).toBe('/en/frettir/ny-stjorn-er-tekin-vid')
  })

  it('falls back to Icelandic and says so when there is no translation', () => {
    const summary = toNewsSummary(doc, 'en')
    expect(summary.title).toBe('Ný stjórn er tekin við')
    expect(summary.contentLocale).toBe('is')
  })

  it('uses the English copy, and reports English, when it exists', () => {
    const summary = toNewsSummary(translated, 'en')
    expect(summary.title).toBe('A new board takes over')
    expect(summary.contentLocale).toBe('en')
  })

  it('treats an empty translation as missing', () => {
    const blank = { ...doc, title: { is: 'Fyrirsögn', en: '' } } as typeof doc
    const summary = toNewsSummary(blank, 'en')
    expect(summary.title).toBe('Fyrirsögn')
    expect(summary.contentLocale).toBe('is')
  })

  it('gives the excerpt its own language, separate from the headline', () => {
    // A translator landed the headline but not the summary. Reporting the
    // headline's language for both would mark Icelandic copy as English, and a
    // screen reader would read it in an English voice (WCAG 3.1.2).
    const halfTranslated = {
      ...doc,
      title: { is: 'Ný stjórn er tekin við', en: 'A new board takes over' },
      excerpt: { is: 'Ný stjórn SVEF tók við störfum á aðalfundi.', en: null },
    } as unknown as typeof doc
    const summary = toNewsSummary(halfTranslated, 'en')
    expect(summary.title).toBe('A new board takes over')
    expect(summary.contentLocale).toBe('en')
    expect(summary.excerpt).toBe('Ný stjórn SVEF tók við störfum á aðalfundi.')
    expect(summary.excerptLocale).toBe('is')
  })

  it('reports English for the excerpt when it is translated', () => {
    expect(toNewsSummary(translated, 'en').excerptLocale).toBe('en')
    expect(toNewsSummary(doc, 'en').excerptLocale).toBe('is')
  })

  it('follows the headline language when there is no excerpt to speak of', () => {
    // Nothing to mark, so nothing to disagree about.
    const noExcerpt = {
      ...translated,
      excerpt: { is: null, en: null },
    } as unknown as typeof doc
    expect(toNewsSummary(noExcerpt, 'en').excerptLocale).toBe('en')
    expect(toNewsSummary(noExcerpt, 'is').excerptLocale).toBe('is')
  })

  it('has no cover until the relationship is populated', () => {
    expect(toNewsSummary(doc, 'is').cover).toBeNull()
    const idOnly = { ...doc, coverImage: 7 } as typeof doc
    expect(toNewsSummary(idOnly, 'is').cover).toBeNull()
  })

  it('has no cover when the media row has no file behind it', () => {
    // An upload row can exist with no URL — a failed or pending upload. There
    // is no <img> to render, and a broken one is worse than the placeholder.
    const noUrl = {
      ...doc,
      coverImage: { id: 7, url: null, width: 1600, height: 900, alt: { is: 'Stjórn' } },
    } as unknown as typeof doc
    expect(toNewsSummary(noUrl, 'is').cover).toBeNull()
  })

  it('falls back to Icelandic alt text, and to empty when there is none', () => {
    const untranslatedAlt = {
      ...doc,
      coverImage: {
        id: 7,
        url: '/media/stjorn.jpg',
        width: null,
        height: null,
        alt: { is: 'Stjórn SVEF', en: null },
      },
    } as unknown as typeof doc
    expect(toNewsSummary(untranslatedAlt, 'en').cover).toEqual({
      url: '/media/stjorn.jpg',
      alt: 'Stjórn SVEF',
      width: null,
      height: null,
    })

    const noAlt = {
      ...doc,
      coverImage: { id: 7, url: '/media/stjorn.jpg', alt: { is: null, en: null } },
    } as unknown as typeof doc
    expect(toNewsSummary(noAlt, 'is').cover?.alt).toBe('')
  })

  it('flattens a populated cover, with alt text in the reading locale', () => {
    const withCover = {
      ...doc,
      coverImage: {
        id: 7,
        url: '/media/stjorn.jpg',
        width: 1600,
        height: 900,
        alt: { is: 'Stjórn SVEF', en: 'The SVEF board' },
      },
    } as unknown as typeof doc
    expect(toNewsSummary(withCover, 'en').cover).toEqual({
      url: '/media/stjorn.jpg',
      alt: 'The SVEF board',
      width: 1600,
      height: 900,
    })
  })
})

describe('toNewsArticle', () => {
  it('carries the body through', () => {
    const withBody = {
      ...doc,
      body: { is: { root: { children: [] } }, en: null },
    } as unknown as typeof doc
    expect(toNewsArticle(withBody, 'is').body).toEqual({ root: { children: [] } })
  })

  it('is null-bodied when nothing has been written', () => {
    expect(toNewsArticle(doc, 'is').body).toBeNull()
  })

  it('reports the body language separately from the headline', () => {
    // A translator landed the headline but not the article itself.
    const halfTranslated = {
      ...doc,
      title: { is: 'Ný stjórn er tekin við', en: 'A new board takes over' },
      body: { is: { root: { children: [] } }, en: null },
    } as unknown as typeof doc
    const article = toNewsArticle(halfTranslated, 'en')
    expect(article.contentLocale).toBe('en')
    expect(article.bodyLocale).toBe('is')
  })

  it('follows the headline language when there is no body to speak of', () => {
    // With no body the page shows the excerpt, which is in the headline's language.
    expect(toNewsArticle(doc, 'en').bodyLocale).toBe('is')
    expect(toNewsArticle(translated, 'en').bodyLocale).toBe('en')
  })
})
