import { describe, it, expect } from 'vitest'
import {
  getDictionary,
  isLocale,
  localePath,
  DEFAULT_LOCALE,
  HIDDEN_PAGES,
  isHiddenPage,
  isHiddenPath,
  withoutHiddenLinks,
  toInternalSegments,
  toPublicSegments,
} from './index'

describe('i18n', () => {
  it('recognizes valid locales only', () => {
    expect(isLocale('is')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('de')).toBe(false)
  })

  it('returns the matching dictionary', () => {
    expect(getDictionary('en').nav.about).toBe('About SVEF')
    expect(getDictionary('is').nav.about).toBe('Um SVEF')
  })

  it('falls back to the default locale for unknown input', () => {
    // @ts-expect-error intentionally passing an invalid locale
    expect(getDictionary('xx')).toBe(getDictionary(DEFAULT_LOCALE))
  })
})

describe('localePath', () => {
  it('prefixes the target locale', () => {
    expect(localePath('/', 'en')).toBe('/en')
    expect(localePath('/', 'is')).toBe('/is')
    expect(localePath('/vidburdir', 'is')).toBe('/is/vidburdir')
  })

  it('translates the page name along with the prefix', () => {
    expect(localePath('/vidburdir', 'en')).toBe('/en/events')
    expect(localePath('/frettir', 'en')).toBe('/en/news')
    expect(localePath('/um-svef', 'en')).toBe('/en/about')
    expect(localePath('/stjorn', 'en')).toBe('/en/board')
    expect(localePath('/log-svef', 'en')).toBe('/en/bylaws')
    expect(localePath('/spurt-og-svarad', 'en')).toBe('/en/faq')
    expect(localePath('/vefverdlaunin', 'en')).toBe('/en/web-awards')
    expect(localePath('/myndir', 'en')).toBe('/en/photos')
    expect(localePath('/skraning', 'en')).toBe('/en/membership')
    expect(localePath('/hafa-samband', 'en')).toBe('/en/contact')
  })

  it('reads a path written in either language', () => {
    // The input is as often the path a reader is on as one written in code.
    expect(localePath('/en/events', 'is')).toBe('/is/vidburdir')
    expect(localePath('/is/vidburdir', 'en')).toBe('/en/events')
    expect(localePath('/en/events', 'en')).toBe('/en/events')
  })

  it('carries anything after the page name across untouched', () => {
    // Document slugs are not localized yet — svef/www#98.
    expect(localePath('/frettir/eitthvad', 'en')).toBe('/en/news/eitthvad')
    expect(localePath('/en/events/kludurkvold', 'is')).toBe('/is/vidburdir/kludurkvold')
  })

  it('replaces an existing prefix rather than stacking one on top', () => {
    expect(localePath('/en', 'is')).toBe('/is')
    expect(localePath('/is', 'en')).toBe('/en')
  })

  it('is idempotent for the locale it is already in', () => {
    expect(localePath('/en/about', 'en')).toBe('/en/about')
    expect(localePath('/is/um-svef', 'is')).toBe('/is/um-svef')
    expect(localePath(localePath('/um-svef', 'en'), 'en')).toBe('/en/about')
  })

  it('leaves a segment that names no page alone', () => {
    expect(localePath('/eitthvad-annad', 'en')).toBe('/en/eitthvad-annad')
  })

  it('only treats a whole segment as a locale prefix', () => {
    expect(localePath('/england', 'en')).toBe('/en/england')
    expect(localePath('/island', 'en')).toBe('/en/island')
    expect(localePath('/en/england', 'is')).toBe('/is/england')
  })

  it('preserves the query string and hash', () => {
    expect(localePath('/en/events#naesti', 'is')).toBe('/is/vidburdir#naesti')
    expect(localePath('/myndir?ar=2025#topp', 'en')).toBe('/en/photos?ar=2025#topp')
    expect(localePath('/?x=1', 'is')).toBe('/is?x=1')
  })

  it('tolerates a path without a leading slash', () => {
    expect(localePath('vidburdir', 'en')).toBe('/en/events')
  })

  it('never returns a protocol-relative URL', () => {
    // `//evil.com` in an href navigates off-site. Unreachable today (Next
    // normalises `//` before render), guarded so it stays that way.
    expect(localePath('//evil.com', 'is')).toBe('/is/evil.com')
    expect(localePath('//evil.com', 'en')).toBe('/en/evil.com')
    expect(localePath('/en//evil.com', 'is')).toBe('/is/evil.com')
    expect(localePath('/is//evil.com', 'en')).toBe('/en/evil.com')
    expect(localePath('///evil.com', 'is')).toBe('/is/evil.com')
    expect(localePath('//evil.com?a=1#b', 'is')).toBe('/is/evil.com?a=1#b')
  })
})

describe('nested routes', () => {
  const id = '0198c7a0-1111-7222-8333-444455556666'

  it('translates the page name and a known sub-page name', () => {
    expect(localePath('/innsendingar', 'en')).toBe('/en/submissions')
    expect(localePath('/minar-sidur', 'en')).toBe('/en/my-pages')
    expect(localePath('/is/minar-sidur/adgangur', 'en')).toBe('/en/my-pages/account')
    expect(localePath('/en/my-pages/account', 'is')).toBe('/is/minar-sidur/adgangur')
    expect(localePath('/stjornbord/notendur', 'en')).toBe('/en/admin/users')
    expect(localePath('/en/admin/tools', 'is')).toBe('/is/stjornbord/verkfaeri')
  })

  it('translates every level of a deeper path', () => {
    expect(localePath('/minar-sidur/verkefni/nytt', 'en')).toBe('/en/my-pages/projects/new')
    expect(localePath('/en/my-pages/projects/new', 'is')).toBe('/is/minar-sidur/verkefni/nytt')
  })

  it('carries an id across untouched, and everything after it', () => {
    expect(localePath(`/minar-sidur/verkefni/${id}`, 'en')).toBe(`/en/my-pages/projects/${id}`)
    expect(localePath(`/en/admin/projects/${id}`, 'is')).toBe(`/is/stjornbord/verkefni/${id}`)
    expect(localePath(`/minar-sidur/verkefni/${id}/nytt`, 'en')).toBe(`/en/my-pages/projects/${id}/nytt`)
    expect(localePath('/en/my-pages/invite/tok-1', 'is')).toBe('/is/minar-sidur/bod/tok-1')
  })

  it('looks a name up only at its own level', () => {
    // `nytt` is a child of `verkefni`, not of the portal root.
    expect(localePath('/minar-sidur/nytt', 'en')).toBe('/en/my-pages/nytt')
    // The admin has no `adgangur`.
    expect(localePath('/stjornbord/adgangur', 'en')).toBe('/en/admin/adgangur')
  })

  it('keeps the query and hash', () => {
    expect(localePath('/is/stjornbord/verkefni?q=a&page=2#x', 'en')).toBe('/en/admin/projects?q=a&page=2#x')
  })

  it('does not translate a sub-page name under a page that has none', () => {
    expect(localePath('/vidburdir/verkefni', 'en')).toBe('/en/events/verkefni')
    expect(localePath('/frettir/projects', 'is')).toBe('/is/frettir/projects')
    expect(localePath(`/innsendingar/${id}`, 'en')).toBe(`/en/submissions/${id}`)
  })

  it('maps public segments to directories and back', () => {
    expect(toInternalSegments(['my-pages', 'projects', 'new'])).toEqual(['minar-sidur', 'verkefni', 'nytt'])
    expect(toInternalSegments(['minar-sidur', 'verkefni', 'nytt'])).toEqual(['minar-sidur', 'verkefni', 'nytt'])
    expect(toInternalSegments(['admin', 'users', id])).toEqual(['stjornbord', 'notendur', id])
    expect(toInternalSegments(['nonsense', 'projects'])).toEqual(['nonsense', 'projects'])
    expect(toPublicSegments(['stjornbord', 'beidnir'], 'en')).toEqual(['admin', 'requests'])
    expect(toPublicSegments(['admin', 'requests'], 'is')).toEqual(['stjornbord', 'beidnir'])
    expect(toPublicSegments([], 'en')).toEqual([])
  })
})

describe('hidden pages', () => {
  it('hides the Web Awards and membership pages', () => {
    expect([...HIDDEN_PAGES].sort()).toEqual(['skraning', 'vefverdlaunin'])
    expect(isHiddenPage('vefverdlaunin')).toBe(true)
    expect(isHiddenPage('skraning')).toBe(true)
    expect(isHiddenPage('vidburdir')).toBe(false)
  })

  it('recognises a hidden page by either name, with or without a locale prefix', () => {
    for (const path of [
      '/vefverdlaunin',
      '/is/vefverdlaunin',
      '/en/web-awards',
      '/web-awards',
      '/is/skraning',
      '/en/membership',
      '/en/membership#umsokn',
      '/en/web-awards?year=2025',
      '/is/vefverdlaunin/2025',
    ]) {
      expect(isHiddenPath(path), path).toBe(true)
    }
  })

  it('leaves every other path alone', () => {
    for (const path of [
      '/',
      '/is',
      '/en/events',
      '/is/vidburdir',
      '/is/frettir/vefverdlaunin-faerast-i-silfurberg',
      '/en/news/web-awards-moves',
      '#umsokn',
      'https://example.com/membership',
      'mailto:svef@svef.is',
    ]) {
      expect(isHiddenPath(path), path).toBe(false)
    }
  })

  it('filters links by the same rule', () => {
    const links = [
      { href: '/is/vidburdir' },
      { href: '/is/vefverdlaunin' },
      { href: '/en/membership' },
      { href: 'https://example.com' },
    ]
    expect(withoutHiddenLinks(links)).toEqual([
      { href: '/is/vidburdir' },
      { href: 'https://example.com' },
    ])
  })
})
