import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROUTE_SEGMENTS } from '@/lib/i18n'
import { REVALIDATE, type RevalidationTarget } from './paths'

/**
 * The path map is the part of on-demand revalidation that fails silently. A
 * missing path means an editor's change sits stale for the full interval with
 * nothing to show for it, which is indistinguishable from the save not having
 * worked — so the map is pinned here rather than trusted.
 */

const paths = (targets: readonly RevalidationTarget[]) => targets.map((t) => t.path)
const APP = join(process.cwd(), 'src/app/')

describe('revalidation paths', () => {
  it('names pages by their directory, because that is what the cache is keyed on', () => {
    // `/en/news` is a rewrite onto `/en/frettir` (src/proxy.ts). The English
    // index is cached as `/en/frettir`; nothing is cached as `/en/news`, so
    // revalidating that would flush nothing at all.
    const news = paths(REVALIDATE.news)
    expect(news).toEqual(expect.arrayContaining(['/is/frettir', '/en/frettir']))
    expect(news).not.toContain('/en/news')
  })

  it('never uses a public English page name', () => {
    const english = new Set(
      (Object.values(ROUTE_SEGMENTS) as { is: string; en: string }[])
        .filter((names) => names.en !== names.is)
        .map((names) => names.en),
    )
    for (const [slug, targets] of Object.entries(REVALIDATE)) {
      for (const { path } of targets) {
        const segments = path.split('/')
        expect(
          segments.filter((s) => english.has(s)),
          `${slug} revalidates ${path}`,
        ).toEqual([])
      }
    }
  })

  it('points every path at a page that exists on disk', () => {
    // A directory renamed in a redesign would otherwise leave a hook flushing a
    // path nothing is cached under.
    for (const [slug, targets] of Object.entries(REVALIDATE)) {
      for (const { path, type } of targets as readonly RevalidationTarget[]) {
        if (type === 'layout') continue
        const file =
          type === 'page'
            ? `${APP}${path}/page.tsx`
            : path === '/sitemap.xml'
              ? `${APP}sitemap.ts`
              : `${APP}(app)/[locale]${path.replace(/^\/(is|en)/, '')}/page.tsx`
        expect(existsSync(file), `${slug} → ${path} (${file})`).toBe(true)
      }
    }
  })

  it('covers both locales for every page it names', () => {
    for (const [slug, targets] of Object.entries(REVALIDATE)) {
      const concrete = paths(
        (targets as readonly RevalidationTarget[]).filter((t) => !t.type),
      )
      for (const path of concrete.filter((p) => p.startsWith('/is'))) {
        expect(concrete, `${slug}: ${path} without its English twin`).toContain(
          path.replace(/^\/is/, '/en'),
        )
      }
    }
  })

  it('reaches every article and every event page by route, whatever the slug', () => {
    // Slugs are localized and renameable, and an event page lists the other
    // events — so a detail page is flushed by its route, not by one slug.
    expect(REVALIDATE.news).toContainEqual({
      path: '/(app)/[locale]/frettir/[slug]',
      type: 'page',
    })
    expect(REVALIDATE.events).toContainEqual({
      path: '/(app)/[locale]/vidburdir/[slug]',
      type: 'page',
    })
  })

  it('refreshes the sitemap when articles or events change', () => {
    expect(paths(REVALIDATE.news)).toContain('/sitemap.xml')
    expect(paths(REVALIDATE.events)).toContain('/sitemap.xml')
  })

  it('invalidates the home page when its events or its awards line change', () => {
    // The subtle bug: the section page updates and the front page does not.
    for (const slug of [
      'events',
      'galleries',
      'award-editions',
      'award-winners',
    ] as const) {
      expect(paths(REVALIDATE[slug]), slug).toEqual(
        expect.arrayContaining(['/is', '/en']),
      )
    }
  })

  it('invalidates articles when a board member changes, for the byline', () => {
    expect(REVALIDATE['board-members']).toContainEqual({
      path: '/(app)/[locale]/frettir/[slug]',
      type: 'page',
    })
    expect(paths(REVALIDATE['board-members'])).toEqual(
      expect.arrayContaining(['/is/stjorn', '/en/stjorn']),
    )
  })

  it('flushes the whole site for site settings and uploads, which can be anywhere', () => {
    expect(REVALIDATE['site-settings']).toEqual([{ path: '/', type: 'layout' }])
    expect(REVALIDATE.media).toEqual([{ path: '/', type: 'layout' }])
  })
})
