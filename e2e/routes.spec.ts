import { readdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { DYNAMIC_ROUTES, PAGES } from './pages'

/**
 * The route table in `pages.ts` is what every other spec iterates, so a page
 * that is never added to it is a page no sweep ever visits — and nothing else
 * notices, because deleting a row just makes the suite smaller and still green.
 *
 * This closes that loop by reading the filesystem: every route segment that
 * renders a `page.tsx` under `src/app/(app)/[locale]/` must appear in `PAGES`.
 */
const APP_DIR = path.resolve(process.cwd(), 'src/app/(app)/[locale]')

/** Every route path rendered under `[locale]`, e.g. `''`, `/frettir`. */
function routePathsOnDisk(dir = APP_DIR, prefix = ''): string[] {
  const found: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })

  if (entries.some((e) => e.isFile() && e.name === 'page.tsx')) found.push(prefix)

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    // Route groups `(x)` and parallel routes `@x` add no path segment; private
    // folders `_x` are not routes at all.
    if (name.startsWith('_')) continue
    if (name.startsWith('(') || name.startsWith('@')) {
      found.push(...routePathsOnDisk(path.join(dir, name), prefix))
      continue
    }
    found.push(...routePathsOnDisk(path.join(dir, name), `${prefix}/${name}`))
  }

  return found
}

test.describe('route table', () => {
  test('every page.tsx under [locale] is listed in PAGES', () => {
    const onDisk = routePathsOnDisk().sort()
    const isDynamic = (p: string) => p.includes('[')

    const listed = new Set<string>(PAGES.map((p) => p.path))
    const declaredDynamic = new Set(DYNAMIC_ROUTES.map((route) => route.pattern))

    const missing = onDisk.filter((p) =>
      isDynamic(p) ? !declaredDynamic.has(p) : !listed.has(p),
    )

    expect(
      missing,
      `these routes exist under src/app/(app)/[locale]/ but are in neither the PAGES ` +
        `table in e2e/pages.ts nor DYNAMIC_ROUTES in this file, so no sweep visits them`,
    ).toEqual([])
  })

  test('every entry in PAGES still exists on disk', () => {
    const onDisk = new Set(routePathsOnDisk())
    const stale = PAGES.map((p) => p.path).filter((p) => !onDisk.has(p))

    expect(
      stale,
      `these paths are in the PAGES table but have no page.tsx under ` +
        `src/app/(app)/[locale]/ — the table has gone stale`,
    ).toEqual([])
  })
})
