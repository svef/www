import { expect, test, type Page } from '@playwright/test'
import { LOCALES, settle, urlFor } from './pages'

/**
 * `/myndir` — albums, tiles and the lightbox (#133).
 *
 * Uploads need R2, so the seed gives two of its three albums eight placeholder photos
 * (`public/dev-fixtures/photos`) and leaves the third empty. That album must not appear:
 * an album without photos reads as a broken page. The paging and the photo description
 * are covered in `PhotoAlbum.test.tsx`, where an album can be given any number of photos.
 */
const COPY = {
  is: { view: 'Skoða mynd', next: 'Næsta mynd', prev: 'Fyrri mynd', close: 'Loka' },
  en: { view: 'View photo', next: 'Next photo', prev: 'Previous photo', close: 'Close' },
} as const

async function open(page: Page, locale: (typeof LOCALES)[number], hash = '') {
  await page.goto(urlFor(locale, '/myndir') + hash)
  await settle(page)
}

for (const locale of LOCALES) {
  const t = COPY[locale]

  test.describe(locale, () => {
    test('renders the albums, each a named region with a grid of tiles', async ({
      page,
    }) => {
      await open(page, locale)
      const albums = page.locator('main#main section[aria-labelledby^="album-"]')
      expect(await albums.count()).toBe(2)
      for (const album of await albums.all()) {
        const heading = album.locator('h2')
        await expect(heading).toHaveCount(1)
        await expect(heading).not.toBeEmpty()
        await expect(
          album.getByRole('button', { name: new RegExp(`^${t.view} \\d+$`) }),
        ).not.toHaveCount(0)
      }
    })

    test('an album with no photos is left off the page', async ({ page }) => {
      await open(page, locale)
      await expect(page.getByRole('heading', { name: 'Aðalfundur 2026' })).toHaveCount(0)
    })

    test('a tile opens the lightbox as a dialog, and Escape closes it and returns focus', async ({
      page,
    }) => {
      await open(page, locale)
      const tile = page.getByRole('button', { name: `${t.view} 3` }).first()
      await tile.focus()
      await page.keyboard.press('Enter')

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('button', { name: t.close })).toBeFocused()
      await expect(dialog.getByRole('status')).toContainText('3')

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(tile).toBeFocused()
    })

    test('arrow keys move through the album and wrap', async ({ page }) => {
      await open(page, locale)
      await page
        .getByRole('button', { name: `${t.view} 1` })
        .first()
        .click()
      const dialog = page.getByRole('dialog')
      const count = dialog.getByRole('status')

      await page.keyboard.press('ArrowRight')
      await expect(count).toContainText(/\b2\b.*\b8\b/)
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')
      await expect(count).toContainText(/\b8\b.*\b8\b/)
    })

    test('focus is trapped inside the open lightbox', async ({ page }) => {
      await open(page, locale)
      await page
        .getByRole('button', { name: `${t.view} 1` })
        .first()
        .click()
      const inside = () =>
        page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab')
        expect(await inside(), `focus escaped the dialog on Tab ${i + 1}`).toBe(true)
      }
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Shift+Tab')
        expect(await inside(), `focus escaped the dialog on Shift+Tab ${i + 1}`).toBe(
          true,
        )
      }
    })

    test('the page behind does not scroll while the lightbox is open', async ({
      page,
    }) => {
      await open(page, locale)
      await page
        .getByRole('button', { name: `${t.view} 1` })
        .first()
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).overflow),
      ).toBe('hidden')
      await page.keyboard.press('Escape')
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).overflow),
      ).not.toBe('hidden')
    })

    test('an album is linkable: #album-<id> lands on that album', async ({ page }) => {
      await open(page, locale)
      const id = await page
        .locator('main#main section[aria-labelledby^="album-"] h2')
        .last()
        .getAttribute('id')
      expect(id).toMatch(/^album-\d+$/)

      await open(page, locale, `#${id}`)
      const heading = page.locator(`[id="${id}"]`)
      await expect(heading).toBeInViewport()
    })

    test('an album linked to an event links to it', async ({ page }) => {
      await open(page, locale)
      const link = page
        .locator('main#main section[aria-labelledby^="album-"] a[href*="/"]')
        .first()
      await expect(link).toHaveAttribute(
        'href',
        new RegExp(`^/${locale}/(vidburdir|events)/`),
      )
    })
  })
}
