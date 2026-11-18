import { test, expect } from '@playwright/test'

const BUNDLE = '/vendor/award3d.js'

test.describe('footer trophy', () => {
  for (const [locale, label] of [
    ['is', 'Verðlaunagripur Íslensku vefverðlaunanna'],
    ['en', 'The Icelandic Web Awards trophy'],
  ] as const) {
    test(`the trophy box is in the footer (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/um-svef`)
      const trophy = page.locator('footer').getByRole('img', { name: label })
      await expect(trophy).toHaveCount(1)
      await expect(trophy.locator('img')).toHaveAttribute('src', /trophy\.webp/)
    })
  }

  test.describe('reduced motion', () => {
    test('never requests the bundle, even scrolled to the footer', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const requests: string[] = []
      page.on('request', (r) => requests.push(r.url()))
      await page.goto('/is/um-svef')
      await page.locator('footer').scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)
      expect(requests.filter((u) => u.includes(BUNDLE))).toEqual([])
      await expect(page.locator('footer canvas')).toHaveCount(0)
      await expect(page.locator('footer img[src*="trophy.webp"]')).toBeVisible()
    })
  })

  test.describe('with motion', () => {
    test('requests the bundle once, only when the footer nears the viewport', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const requests: string[] = []
      page.on('request', (r) => requests.push(r.url()))
      await page.goto('/is/um-svef')
      await page.waitForLoadState('networkidle')
      expect(requests.filter((u) => u.includes(BUNDLE))).toEqual([])

      await page.locator('footer').scrollIntoViewIfNeeded()
      await expect(page.locator('footer canvas')).toHaveCount(1)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.locator('footer').scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      expect(requests.filter((u) => u.includes(BUNDLE))).toHaveLength(1)
    })
  })
})
