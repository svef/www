import { expect, test } from '@playwright/test'
import { LOCALES, urlFor } from './pages'

/**
 * The contact page and the talk-proposal page: content beyond the heading.
 *
 * Nothing here submits a valid form, so no row reaches the database: the talk
 * proposal is only ever submitted empty, which the server rejects before storing.
 */
for (const locale of LOCALES) {
  test.describe(`contact and talk proposal (${locale})`, () => {
    test('contact: an address to write to and a form whose fields are labelled', async ({ page }) => {
      await page.goto(urlFor(locale, '/hafa-samband'))
      await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible()
      const form = page.getByRole('form')
      await expect(form).toBeVisible()
      await expect(form.getByRole('textbox')).toHaveCount(3)
      await expect(page.getByLabel(locale === 'is' ? 'Netfang' : 'Email')).toHaveAttribute('type', 'email')
    })

    test('contact: an empty form is stopped by the browser and does not claim to be sent', async ({ page }) => {
      await page.goto(urlFor(locale, '/hafa-samband'))
      await page.getByRole('button', { name: locale === 'is' ? 'Senda' : 'Send' }).click()
      await expect(page.getByRole('form')).toBeVisible()
      await expect(page.getByRole('status').filter({ hasText: /\S/ })).toHaveCount(0)
    })

    test('talk proposal: topics are toggleable chips', async ({ page }) => {
      await page.goto(urlFor(locale, '/erindi'))
      const accessibility = page.locator('#tp-topic-accessibility')
      await expect(page.getByRole('group').first()).toBeVisible()
      await expect(accessibility).not.toBeChecked()
      await accessibility.check()
      await page.locator('#tp-topic-design').check()
      await expect(accessibility).toBeChecked()
      await accessibility.uncheck()
      await expect(accessibility).not.toBeChecked()
      await expect(page.locator('#tp-topic-design')).toBeChecked()
    })

    test('talk proposal: an empty submission lists what is missing, linking to each field', async ({ page }) => {
      await page.goto(urlFor(locale, '/erindi'))
      await page.getByRole('button', { name: locale === 'is' ? 'Senda erindi' : /Send/ }).click()
      const summary = page.getByRole('alert').filter({ has: page.locator('a[href="#tp-name"]') })
      await expect(summary).toBeVisible()
      for (const id of ['tp-name', 'tp-email', 'tp-title', 'tp-summary']) {
        await expect(summary.locator(`a[href="#${id}"]`)).toBeVisible()
      }
      // Optional, so never reported when empty.
      await expect(summary.locator('a[href="#tp-notes"]')).toHaveCount(0)
    })
  })
}
