import { expect, test } from '@playwright/test'
import { LOCALES, urlFor } from './pages'

/**
 * The feedback form's subject chips (#142): "general" is pre-selected, as in the export.
 * Nothing here submits a valid form, so no row reaches the database.
 */
for (const locale of LOCALES) {
  test.describe(`feedback form (${locale})`, () => {
    test('general is pre-selected, and "other" reveals its field', async ({ page }) => {
      await page.goto(urlFor(locale, '/abendingar'))
      await expect(page.locator('#fb-choice-general')).toBeChecked()
      await expect(page.locator('#fb-subject-other')).toHaveCount(0)

      await page.locator('#fb-choice-other').check()
      await expect(page.locator('#fb-choice-other')).toBeChecked()
      await expect(page.locator('#fb-subject-other')).toBeVisible()

      await page.locator('#fb-choice-general').check()
      await expect(page.locator('#fb-subject-other')).toHaveCount(0)
    })

    test('submitting without a message reports the message, not the subject', async ({ page }) => {
      await page.goto(urlFor(locale, '/abendingar'))
      await page.getByRole('button', { name: locale === 'is' ? 'Senda ábendingu' : /Send/ }).click()
      const summary = page.locator('a[href="#fb-message"]')
      await expect(summary).toBeVisible()
      await expect(page.locator('a[href="#fb-choice-general"]')).toHaveCount(0)
    })

    test('"other" with no description is reported', async ({ page }) => {
      await page.goto(urlFor(locale, '/abendingar'))
      await page.locator('#fb-choice-other').check()
      await page.locator('#fb-message').fill('Hello')
      await page.getByRole('button', { name: locale === 'is' ? 'Senda ábendingu' : /Send/ }).click()
      await expect(page.locator('a[href="#fb-subject-other"]')).toBeVisible()
    })
  })
}
