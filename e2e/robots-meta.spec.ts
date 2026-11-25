import { existsSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import * as schema from '../src/lib/awards/db/schema'
import { createUser, openFixtureDb } from '../src/lib/awards/staff/test-fixtures'
import { actAs } from './awards-session'
import { LOCALES, urlFor } from './pages'

/**
 * Which pages ask search engines to stay away (part of #33).
 *
 * The signed-in portal, the admin and the account flows carry
 * `<meta name="robots" content="noindex, nofollow">`; public pages carry no robots meta at
 * all. The portal pages are visited signed in (through the test-session cookie), since a
 * signed-out visitor only ever sees the redirect to sign-in.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

let fixtures: ReturnType<typeof openFixtureDb> | undefined
const db = () => (fixtures ??= openFixtureDb()).db
test.afterAll(async () => {
  await fixtures?.close()
  fixtures = undefined
})

const robotsMeta = (page: Page) => page.locator('meta[name="robots"]')

async function expectNoindex(page: Page) {
  await expect(robotsMeta(page)).toHaveCount(1)
  await expect(robotsMeta(page)).toHaveAttribute('content', 'noindex, nofollow')
}

const PUBLIC = ['', '/vidburdir', '/frettir', '/innsendingar', '/abendingar']
const ACCOUNT = [
  '/innskraning',
  '/nyskraning',
  '/gleymt-lykilord',
  '/endurstilla-lykilord',
  '/stadfesta-netfang',
]
const PORTAL = [
  '/minar-sidur',
  '/minar-sidur/adgangur',
  '/stjornbord',
  '/stjornbord/notendur',
]

for (const locale of LOCALES) {
  test.describe(locale, () => {
    test('public pages can be indexed', async ({ page }) => {
      for (const path of PUBLIC) {
        const response = await page.goto(urlFor(locale, path))
        expect(response?.status(), path).toBe(200)
        await expect(robotsMeta(page), path).toHaveCount(0)
        expect(response?.headers()['x-robots-tag'], path).toBeUndefined()
      }
    })

    test('account pages are noindex', async ({ page }) => {
      for (const path of ACCOUNT) {
        const response = await page.goto(urlFor(locale, path))
        expect(response?.status(), path).toBe(200)
        await expectNoindex(page)
        expect(response?.headers()['x-robots-tag'], path).toBe('noindex, nofollow')
      }
    })

    test('portal and admin pages are noindex', async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL })
      const id = await createUser(db(), 'robots')
      await db().insert(schema.userRole).values({ userId: id, role: 'admin' })
      await actAs(context, baseURL!, id)
      const page = await context.newPage()
      for (const path of PORTAL) {
        const response = await page.goto(urlFor(locale, path))
        expect(response?.status(), path).toBe(200)
        expect(new URL(page.url()).pathname, path).toBe(urlFor(locale, path))
        await expectNoindex(page)
        expect(response?.headers()['x-robots-tag'], path).toBe('noindex, nofollow')
      }
      await context.close()
    })

    test('signed out, the redirect away from the portal says noindex too', async ({
      request,
    }) => {
      const response = await request.get(urlFor(locale, '/minar-sidur'), {
        maxRedirects: 0,
      })
      expect(response.status()).toBeGreaterThanOrEqual(300)
      expect(response.status()).toBeLessThan(400)
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow')
    })
  })
}

test('robots.txt disallows the portal and the admin, not the account pages', async ({
  request,
}) => {
  const body = await (await request.get('/robots.txt')).text()
  for (const path of [
    '/admin',
    '/api',
    '/is/minar-sidur',
    '/en/my-pages',
    '/is/stjornbord',
    '/en/admin',
  ]) {
    expect(body).toContain(`Disallow: ${path}\n`)
  }
  expect(body).not.toMatch(
    /Disallow: \/(is|en)\/(innskraning|sign-in|innsendingar|submissions)/,
  )
})

test('the sitemap lists public pages only', async ({ request }) => {
  const body = await (await request.get('/sitemap.xml')).text()
  expect(body).toContain('/is/innsendingar</loc>')
  expect(body).toContain('/en/events</loc>')
  expect(body).not.toMatch(
    /\/(is|en)\/(minar-sidur|my-pages|stjornbord|admin|innskraning|sign-in|nyskraning|sign-up|gleymt-lykilord|forgot-password|endurstilla-lykilord|reset-password|stadfesta-netfang|verify-email)\b/,
  )
})
