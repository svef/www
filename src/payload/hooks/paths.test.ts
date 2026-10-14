import { describe, expect, it } from 'vitest'
import {
  aboutPagePaths,
  boardPaths,
  eventPaths,
  newsPaths,
  siteSettingsPaths,
} from './paths'

/**
 * The path map is the part of on-demand revalidation that fails silently. A
 * missing path means an editor's change sits stale for the full interval with
 * nothing to show for it, which is indistinguishable from the save not having
 * worked — so the map is pinned here rather than trusted.
 */
describe('revalidation paths', () => {
  it('covers both locales for a list page', () => {
    expect(newsPaths()).toEqual(expect.arrayContaining(['/is/frettir', '/en/news']))
  })

  it('translates the page name, not just the prefix', () => {
    // The English route is /en/news, never /en/frettir — that exists only as a
    // redirect, and revalidating it would warm the wrong entry.
    const paths = newsPaths()
    expect(paths).toContain('/en/news')
    expect(paths).not.toContain('/en/frettir')
  })

  it('uses each locale its own slug, because slugs are localised', () => {
    const paths = newsPaths({ is: 'ny-stjorn', en: 'a-new-board' })
    expect(paths).toContain('/is/frettir/ny-stjorn')
    expect(paths).toContain('/en/news/a-new-board')
    // Never the other language's slug under this locale.
    expect(paths).not.toContain('/en/news/ny-stjorn')
    expect(paths).not.toContain('/is/frettir/a-new-board')
  })

  it('skips a locale with no slug rather than inventing a path', () => {
    const paths = newsPaths({ is: 'adeins-islenska' })
    expect(paths).toContain('/is/frettir/adeins-islenska')
    expect(paths.some((p) => p.includes('undefined'))).toBe(false)
    expect(paths.filter((p) => p.startsWith('/en/news/'))).toHaveLength(0)
  })

  it('treats an empty slug as absent', () => {
    expect(newsPaths({ is: '', en: '' }).some((p) => p.endsWith('/'))).toBe(false)
  })

  it('invalidates the home page too, since it lists news and events', () => {
    // The subtle bug: the section page updates and the front page does not.
    expect(newsPaths()).toEqual(expect.arrayContaining(['/is', '/en']))
    expect(eventPaths()).toEqual(expect.arrayContaining(['/is', '/en']))
  })

  it('invalidates About when the board changes, not only the board page', () => {
    expect(boardPaths()).toEqual(
      expect.arrayContaining(['/is/stjorn', '/en/board', '/is/um-svef', '/en/about']),
    )
  })

  it('reaches every public page for site settings, which are in the chrome', () => {
    const paths = siteSettingsPaths()
    // One per locale for each of the ten public pages, plus the two home pages.
    for (const expected of [
      '/is',
      '/en',
      '/is/frettir',
      '/en/news',
      '/is/vidburdir',
      '/en/events',
      '/is/vefverdlaunin',
      '/en/web-awards',
      '/is/um-svef',
      '/en/about',
      '/is/stjorn',
      '/en/board',
      '/is/log-svef',
      '/en/bylaws',
      '/is/spurt-og-svarad',
      '/en/faq',
      '/is/myndir',
      '/en/photos',
      '/is/skraning',
      '/en/membership',
    ]) {
      expect(paths).toContain(expected)
    }
  })

  it('spreads the About global across the pages it feeds', () => {
    expect(aboutPagePaths()).toEqual(
      expect.arrayContaining([
        '/is/um-svef',
        '/is/log-svef',
        '/is/spurt-og-svarad',
        '/en/faq',
      ]),
    )
  })
})
