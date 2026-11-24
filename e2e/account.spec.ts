import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LOCALES, urlFor } from './pages'
import { localePath } from '../src/lib/i18n'

/**
 * Awards accounts (svef/www#158): sign up → verify (link read from the local
 * email outbox) → sign out → sign in, and the password reset, in both locales.
 *
 * The app under test runs with `AWARDS_EMAIL_OUTBOX=1` (playwright.config.ts), so
 * its emails land in `.awards-outbox/` instead of being sent. Every test uses its
 * own address, so the tests do not depend on each other and can run in parallel.
 */
const OUTBOX = path.resolve(process.cwd(), '.awards-outbox')
const PASSWORD = 'correct horse battery'

const copy = {
  is: {
    name: 'Nafn',
    email: 'Netfang',
    password: 'Lykilorð',
    signUp: 'Stofna aðgang',
    signIn: 'Skrá inn',
    signOut: 'Skrá út',
    created: 'Aðgangur stofnaður',
    verified: 'Netfangið er staðfest',
    signedIn: 'Þú ert innskráð(ur)',
    send: 'Senda tengil',
    checkMail: 'Athugaðu póstinn þinn',
    newPassword: 'Nýtt lykilorð',
    save: 'Vista lykilorð',
    updated: 'Lykilorðið er uppfært',
    wrong: 'Netfang eða lykilorð er rangt.',
    show: 'Sýna lykilorð',
    hide: 'Fela lykilorð',
    subject: /Staðfestu netfangið/,
    requestNew: 'Biðja um nýjan tengil',
    resetSubject: /Endurstilltu lykilorðið/,
  },
  en: {
    name: 'Name',
    email: 'Email',
    password: 'Password',
    signUp: 'Create account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    created: 'Account created',
    verified: 'Your email address is confirmed',
    signedIn: 'You are signed in',
    send: 'Send link',
    checkMail: 'Check your email',
    newPassword: 'New password',
    save: 'Save password',
    updated: 'Password updated',
    wrong: 'The email or password is wrong.',
    show: 'Show password',
    hide: 'Hide password',
    subject: /Confirm your email/,
    requestNew: 'Ask for a new link',
    resetSubject: /Reset your password/,
  },
} as const

interface Mail {
  to: string
  subject: string
  text: string
}

/** The newest outbox message to `to`, waiting for it to be written. */
async function mailTo(to: string): Promise<Mail & { link: string }> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[]))
      .filter((f) => f.endsWith(`-${to}.json`))
      .sort()
    const latest = files.at(-1)
    if (latest) {
      const mail = JSON.parse(await readFile(path.join(OUTBOX, latest), 'utf8')) as Mail
      const link = mail.text.match(/https?:\/\/\S+/)?.[0]
      if (link) return { ...mail, link }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`no email to ${to} in ${OUTBOX}`)
}

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`

async function signUp(page: Page, locale: 'is' | 'en', email: string) {
  const c = copy[locale]
  await page.goto(urlFor(locale, '/nyskraning'))
  await page.getByLabel(c.name).fill('Test Person')
  await page.getByLabel(c.email).fill(email)
  await page.getByLabel(c.password, { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: c.signUp }).click()
  await expect(page.getByRole('heading', { name: c.created })).toBeVisible()
}

for (const locale of LOCALES) {
  const c = copy[locale]

  test.describe(`accounts (${locale})`, () => {
    test('sign up, verify by email, sign out, sign in', async ({ page }) => {
      const email = uniqueEmail('verify')
      await signUp(page, locale, email)

      const mail = await mailTo(email)
      expect(mail.subject).toMatch(c.subject)
      expect(new URL(mail.link).pathname).toBe('/api/account/verify-email')

      // The link verifies the address and lands on the confirmation page.
      await page.goto(mail.link)
      await expect(page).toHaveURL(new RegExp(`${localePath('/stadfesta-netfang', locale)}\\?status=verified`))
      await expect(page.getByRole('heading', { name: c.verified })).toBeVisible()

      // Signed in already (verification signs in); sign out from the sign-in page.
      const signInPage = urlFor(locale, '/innskraning')
      await page.goto(signInPage)
      await expect(page.getByRole('heading', { name: c.signedIn })).toBeVisible()
      await page.getByRole('button', { name: c.signOut }).click()
      await expect(page).toHaveURL(new RegExp(`${localePath('/innskraning', locale)}$`))
      await expect(page.getByRole('button', { name: c.signIn })).toBeVisible()

      // Wrong password is refused and announced; the right one signs in and follows `next`.
      await page.getByLabel(c.email).fill(email)
      await page.getByLabel(c.password, { exact: true }).fill('not the password')
      await page.getByRole('button', { name: c.signIn }).click()
      await expect(page.locator('main [role="alert"]')).toContainText(c.wrong)

      await page.goto(`${signInPage}?next=${encodeURIComponent(signInPage)}`)
      await page.getByLabel(c.email).fill(email)
      await page.getByLabel(c.password, { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: c.signIn }).click()
      await expect(page.getByRole('heading', { name: c.signedIn })).toBeVisible()
    })

    test('signing in without a next goes to the dashboard path', async ({ page, request }) => {
      const email = uniqueEmail('dash')
      const res = await request.post('/api/account/sign-up/email', {
        data: { name: 'Dash Person', email, password: PASSWORD, preferredLocale: locale },
      })
      expect(res.ok()).toBe(true)

      await page.goto(urlFor(locale, '/innskraning'))
      await page.getByLabel(c.email).fill(email)
      await page.getByLabel(c.password, { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: c.signIn }).click()
      await page.waitForURL(`**${localePath('/innsendingar/minar', locale)}`)
    })

    test('a hostile next is ignored', async ({ page, request }) => {
      const email = uniqueEmail('next')
      await request.post('/api/account/sign-up/email', {
        data: { name: 'Next Person', email, password: PASSWORD, preferredLocale: locale },
      })
      await page.goto(`${urlFor(locale, '/innskraning')}?next=${encodeURIComponent('https://evil.example/')}`)
      await page.getByLabel(c.email).fill(email)
      await page.getByLabel(c.password, { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: c.signIn }).click()
      await page.waitForURL(`**${localePath('/innsendingar/minar', locale)}`)
    })

    test('password reset by email', async ({ page, request }) => {
      const email = uniqueEmail('reset')
      const res = await request.post('/api/account/sign-up/email', {
        data: { name: 'Reset Person', email, password: PASSWORD, preferredLocale: locale },
      })
      expect(res.ok()).toBe(true)

      await page.goto(urlFor(locale, '/gleymt-lykilord'))
      await page.getByLabel(c.email).fill(email)
      await page.getByRole('button', { name: c.send }).click()
      await expect(page.getByRole('heading', { name: c.checkMail })).toBeVisible()

      // Two messages go to this address (verification, then reset); take the reset one.
      let mail = await mailTo(email)
      for (let i = 0; i < 30 && !c.resetSubject.test(mail.subject); i++) {
        await page.waitForTimeout(100)
        mail = await mailTo(email)
      }
      expect(mail.subject).toMatch(c.resetSubject)
      expect(new URL(mail.link).pathname).toContain('/api/account/reset-password/')

      await page.goto(mail.link)
      await expect(page).toHaveURL(new RegExp(`${localePath('/endurstilla-lykilord', locale)}\\?token=`))
      const fresh = 'a brand new passphrase'
      await page.getByLabel(c.newPassword, { exact: true }).fill(fresh)
      await page.getByRole('button', { name: c.save }).click()
      await expect(page.getByRole('heading', { name: c.updated })).toBeVisible()

      // The old password no longer works; the new one does.
      const target = urlFor(locale, '/innskraning')
      await page.goto(target)
      await page.getByLabel(c.email).fill(email)
      await page.getByLabel(c.password, { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: c.signIn }).click()
      await expect(page.locator('main [role="alert"]')).toContainText(c.wrong)

      await page.goto(`${target}?next=${encodeURIComponent(target)}`)
      await page.getByLabel(c.email).fill(email)
      await page.getByLabel(c.password, { exact: true }).fill(fresh)
      await page.getByRole('button', { name: c.signIn }).click()
      await expect(page.getByRole('heading', { name: c.signedIn })).toBeVisible()
    })

    test('a missing reset token offers a new link', async ({ page }) => {
      await page.goto(urlFor(locale, '/endurstilla-lykilord'))
      await expect(page.getByRole('link', { name: c.requestNew })).toHaveAttribute(
        'href',
        localePath('/gleymt-lykilord', locale),
      )
    })

    test('password field can be shown and hidden', async ({ page }) => {
      await page.goto(urlFor(locale, '/innskraning'))
      const field = page.getByLabel(c.password, { exact: true })
      await expect(field).toHaveAttribute('type', 'password')
      await expect(field).toHaveAttribute('autocomplete', 'current-password')
      await page.getByRole('button', { name: c.show }).click()
      await expect(field).toHaveAttribute('type', 'text')
      await page.getByRole('button', { name: c.hide }).click()
      await expect(field).toHaveAttribute('type', 'password')
    })

    test('an empty sign-up is refused with announced, linked errors', async ({ page }) => {
      await page.goto(urlFor(locale, '/nyskraning'))
      await page.getByRole('button', { name: c.signUp }).click()
      const alert = page.locator('main [role="alert"]')
      await expect(alert).toBeVisible()
      await expect(alert.getByRole('link')).toHaveCount(3)
      await expect(page.getByLabel(c.email)).toHaveAttribute('aria-invalid', 'true')
    })
  })
}
