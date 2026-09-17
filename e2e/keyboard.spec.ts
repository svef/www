import { expect, test } from '@playwright/test'
import { LOCALES, urlFor } from './pages'

test.describe('keyboard operability', () => {
  for (const locale of LOCALES) {
    test(`${locale}: the skip link is the first stop and jumps to main`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))

      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      await expect(focused).toHaveClass(/skip-link/)
      // A skip link that is only in the DOM is not a skip link — it has to be
      // visible once focused.
      await expect(focused).toBeVisible()

      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/#main$/)

      // `<main>` is not itself focusable, so activating the link does not move
      // `document.activeElement`; what it moves is the sequential focus
      // navigation start point. The behaviour that actually matters to someone
      // using the link is therefore the *next* Tab: it must land inside
      // `<main>`, not back in the header nav.
      await page.keyboard.press('Tab')
      const landedInMain = await page.evaluate(() => {
        const main = document.getElementById('main')
        const active = document.activeElement
        return Boolean(main && active && main.contains(active))
      })
      expect(landedInMain, 'the Tab after the skip link did not land inside <main>').toBe(true)
    })
  }

  // The lightbox is the whole point of the gallery (#25): nothing else covers
  // it, and every one of these behaviours is invisible to a smoke test.
  test.describe('gallery lightbox', () => {
    test('opens, traps focus, moves with the arrow keys and closes on Esc', async ({ page }) => {
      await page.goto(urlFor('is', '/myndir'))

      // The page lists every album, each as its own named region with its own
      // grid and its own lightbox, so this scopes to one album by name — the
      // counter in the dialog belongs to that album, not to the page. Named
      // rather than positional: `.first()` would silently retarget if anything
      // above it ever gained an accessible name.
      const album = page.getByRole('region', { name: 'Íslensku vefverðlaunin 2025' })
      const thumbs = album.getByRole('button', { name: /^Skoða mynd/ })
      const count = await thumbs.count()
      expect(count, 'gallery rendered no thumbnails').toBeGreaterThan(1)

      await thumbs.first().click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText(`1 / ${count}`)

      // Focus must be inside the dialog, and must stay there while tabbing.
      const inDialog = async () =>
        dialog.evaluate((node) => node.contains(document.activeElement))
      await expect.poll(inDialog, { message: 'focus never entered the dialog' }).toBe(true)
      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.press('Tab')
        expect(await inDialog(), `Tab ${i + 1} escaped the dialog`).toBe(true)
      }

      await page.keyboard.press('ArrowRight')
      await expect(dialog).toContainText(`2 / ${count}`)
      await page.keyboard.press('ArrowLeft')
      await expect(dialog).toContainText(`1 / ${count}`)
      // Wrap backwards from the first image rather than dead-ending.
      await page.keyboard.press('ArrowLeft')
      await expect(dialog).toContainText(`${count} / ${count}`)

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    })

    test('the previous/next controls are reachable and labelled', async ({ page }) => {
      await page.goto(urlFor('en', '/myndir'))
      await page
        .getByRole('region', { name: 'Íslensku vefverðlaunin 2025' })
        .getByRole('button', { name: /^View photo/ })
        .first()
        .click()

      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: 'Previous photo' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Next photo' })).toBeVisible()

      await dialog.getByRole('button', { name: 'Next photo' }).click()
      await expect(dialog).toContainText('2 /')
    })
  })
})
