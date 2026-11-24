import { expect, test } from '@playwright/test'
import { LOCALES, urlFor } from './pages'

/**
 * The public submissions page: the choices, prices, dates and the call to action.
 *
 * The figures are the seed data's (`categories-2026.json`, loaded by
 * `npm run awards:seed`); the prices are asserted in each locale's own number format.
 * The call to action depends on the server clock, so the test reads the same dates
 * the page does and expects whichever state applies today. (The open state is also
 * covered by `SubmissionCta.test.tsx`, which does not wait for 1 December.)
 */
const OPENS = Date.parse('2026-12-01T00:00:00Z')
const CLOSES = Date.parse('2027-02-02T00:00:00Z')

const COPY = {
  is: { early: 'Snemmskráning', regular: 'Almennt verð', start: 'Hefja innsendingu', signIn: 'Skrá inn' },
  en: { early: 'Early bird', regular: 'Regular price', start: 'Start a submission', signIn: 'Sign in' },
} as const

const money = (locale: 'is' | 'en', n: number) =>
  `${new Intl.NumberFormat(locale === 'is' ? 'is-IS' : 'en-GB').format(n)} kr.`

for (const locale of LOCALES) {
  test.describe(`submissions page (${locale})`, () => {
    const url = urlFor(locale, '/innsendingar')

    test('shows the fifteen choices, the group holding its four tiers', async ({ page }) => {
      await page.goto(url)
      const cards = page.locator('main ul[aria-label] > li[data-choice]')
      await expect(cards).toHaveCount(15)
      const group = page.locator('[data-choice="company-website"]')
      await expect(group.locator('[data-category]')).toHaveCount(4)
    })

    test('prints the regular and early-bird prices', async ({ page }) => {
      await page.goto(url)
      const marketing = page.locator('[data-choice="marketing-website"]')
      await expect(marketing).toContainText(money(locale, 26900))
      await expect(marketing).toContainText(money(locale, 18900))
      await expect(marketing).toContainText(COPY[locale].early)
      await expect(marketing).toContainText(COPY[locale].regular)
      const startup = page.locator('[data-category="company-website-startup"]')
      await expect(startup).toContainText(money(locale, 9900))
      await expect(startup).toContainText(money(locale, 6900))
    })

    test('gives the key dates', async ({ page }) => {
      await page.goto(url)
      const dates = page.locator('[data-date] time')
      await expect(dates).toHaveCount(4)
      await expect(dates.nth(0)).toHaveAttribute('datetime', '2026-12-01')
      await expect(dates.nth(1)).toHaveAttribute('datetime', '2027-01-04')
      await expect(dates.nth(2)).toHaveAttribute('datetime', '2027-02-01')
      await expect(dates.nth(3)).toHaveAttribute('datetime', '2027-03-19')
    })

    test('a description opens and closes from the keyboard', async ({ page }) => {
      await page.goto(url)
      const details = page.locator('[data-choice="marketing-website"] details')
      const summary = details.locator('summary')
      await expect(details).not.toHaveAttribute('open', '')
      await summary.focus()
      await page.keyboard.press('Enter')
      await expect(details).toHaveAttribute('open', '')
      await expect(details.locator('p').first()).toBeVisible()
      await page.keyboard.press('Enter')
      await expect(details).not.toHaveAttribute('open', '')
    })

    test('the call to action follows the clock', async ({ page }) => {
      await page.goto(url)
      const panel = page.locator('[data-phase]')
      const now = Date.now()
      if (now < OPENS) {
        await expect(panel).toHaveAttribute('data-phase', 'before')
        await expect(panel.getByRole('link')).toHaveCount(0)
      } else if (now < CLOSES) {
        await expect(panel).toHaveAttribute('data-phase', 'open')
        const next = encodeURIComponent(urlFor(locale, '/innsendingar/minar'))
        await expect(panel.getByRole('link', { name: COPY[locale].start })).toHaveAttribute(
          'href',
          `${urlFor(locale, '/nyskraning')}?next=${next}`,
        )
        await expect(panel.getByRole('link', { name: COPY[locale].signIn })).toHaveAttribute(
          'href',
          `${urlFor(locale, '/innskraning')}?next=${next}`,
        )
      } else {
        await expect(panel).toHaveAttribute('data-phase', 'closed')
        await expect(panel.getByRole('link')).toHaveCount(0)
      }
    })
  })
}

test('the page answers at both locales’ names and redirects the wrong one', async ({ request }) => {
  const wrong = await request.get('/en/innsendingar', { maxRedirects: 0 })
  expect(wrong.status()).toBeGreaterThanOrEqual(300)
  expect(new URL(wrong.headers()['location'], 'http://localhost').pathname).toBe('/en/submissions')
})
