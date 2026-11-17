import { describe, it, expect } from 'vitest'
import { getDictionary, HIDDEN_PAGES, isHiddenPath, type Locale } from '@/lib/i18n'
import {
  buildFooterColumns,
  buildNavItems,
  visibleFooterColumns,
  visibleNavItems,
} from './nav'

const locales: Locale[] = ['is', 'en']

describe.each(locales)('navigation (%s)', (locale) => {
  const t = getDictionary(locale)

  it('prefixes every link with the locale', () => {
    const hrefs = [
      ...buildNavItems(locale, t).flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]),
      ...buildFooterColumns(locale, t).flatMap((c) => c.links.map((l) => l.href)),
    ]
    expect(hrefs.length).toBeGreaterThan(10)
    for (const href of hrefs) expect(href.startsWith(`/${locale}/`)).toBe(true)
  })

  it('puts events first', () => {
    expect(buildNavItems(locale, t)[0].href).toBe(locale === 'en' ? '/en/events' : '/is/vidburdir')
  })

  it('drops hidden pages from the header, items and children alike', () => {
    const all = buildNavItems(locale, t)
    const visible = visibleNavItems(locale, t)
    expect(visible.length).toBeLessThan(all.length)
    for (const item of visible) {
      expect(isHiddenPath(item.href)).toBe(false)
      for (const child of item.children ?? []) expect(isHiddenPath(child.href)).toBe(false)
    }
  })

  it('keeps the About submenu when only its siblings are hidden', () => {
    const about = visibleNavItems(locale, t).find((i) => i.children)
    expect(about?.children).toHaveLength(3)
  })

  it('drops hidden pages from the footer and never leaves an empty column', () => {
    const columns = visibleFooterColumns(locale, t)
    for (const column of columns) {
      expect(column.links.length).toBeGreaterThan(0)
      for (const link of column.links) expect(isHiddenPath(link.href)).toBe(false)
    }
  })
})

describe('hidden pages', () => {
  it('are the ones the header and footer would otherwise link to', () => {
    // If this fails the switch in routes.ts no longer reaches the navigation.
    const t = getDictionary('is')
    const hrefs = [
      ...buildNavItems('is', t).map((i) => i.href),
      ...buildFooterColumns('is', t).flatMap((c) => c.links.map((l) => l.href)),
    ]
    for (const key of HIDDEN_PAGES) expect(hrefs).toContain(`/is/${key}`)
  })
})
