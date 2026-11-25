import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { eq } from 'drizzle-orm'
import { expect, test, type Page } from '@playwright/test'
import * as schema from '../src/lib/awards/db/schema'
import { openFixtureDb } from '../src/lib/awards/staff/test-fixtures'
import { settle, urlFor } from './pages'

/**
 * Mínar síður → Aðgangur: name, phone and email language saved on the account, the email
 * shown but not editable, the password changed through Better Auth, and signing out. A real
 * account (Better Auth sign-up), since the password change needs a real session.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const { db, close } = openFixtureDb()
test.afterAll(() => close())
const PASSWORD = 'correct horse battery'
const NEW_PASSWORD = 'staple battery horse 2'

async function signUp(page: Page) {
  const email = `account-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
  const res = await page.request.post('/api/account/sign-up/email', {
    data: { name: 'Gamla Nafnið', email, password: PASSWORD, preferredLocale: 'is' },
  })
  expect(res.ok(), await res.text()).toBe(true)
  return email
}

test('updates name, phone and email language, and the avatar menu follows', async ({ page }) => {
  const email = await signUp(page)
  await page.goto(urlFor('is', '/minar-sidur/adgangur'))
  await settle(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aðgangur')
  await expect(page.getByTestId('account-email')).toContainText(email)
  // The email is shown, not editable.
  await expect(page.getByRole('textbox', { name: 'Netfang' })).toHaveCount(0)

  // A bad phone number is refused and named in the summary.
  await page.getByLabel('Símanúmer').fill('hringdu í mig')
  await page.getByRole('button', { name: 'Vista' }).click()
  const alert = page.locator('main [role="alert"]')
  await expect(alert).toContainText('Símanúmer: Sláðu inn símanúmer')
  await expect(page.getByLabel('Símanúmer')).toHaveAttribute('aria-invalid', 'true')

  await page.getByLabel('Nafn', { exact: true }).fill('  Nýja   Nafnið ')
  await page.getByLabel('Símanúmer').fill('+354 555 1234')
  await page.getByLabel('Tungumál tölvupósts').selectOption('en')
  await page.getByRole('button', { name: 'Vista' }).click()
  await expect(page.getByText('Breytingarnar eru vistaðar.')).toBeVisible()
  await expect(page.locator('[data-user-menu]')).toContainText('Nýja Nafnið')
  await expect(page.locator('[data-user-menu]')).toContainText('NN')

  const [row] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  expect(row).toMatchObject({ name: 'Nýja Nafnið', phone: '+354 555 1234', preferredLocale: 'en' })

  // After a reload the form shows what was saved.
  await page.reload()
  await expect(page.getByLabel('Nafn', { exact: true })).toHaveValue('Nýja Nafnið')
  await expect(page.getByLabel('Tungumál tölvupósts')).toHaveValue('en')
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
})

test('changes the password, then signs out from the avatar menu and back in with it', async ({ page }) => {
  const email = await signUp(page)
  await page.goto(urlFor('en', '/minar-sidur/adgangur'))
  await settle(page)

  await page.getByLabel('Current password').fill('not my password')
  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.locator('main [role="alert"]')).toContainText('The current password is not right.')

  await page.getByLabel('Current password').fill(PASSWORD)
  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Your password was changed.')).toBeVisible()

  // Still signed in here: the page still works.
  await page.reload()
  await expect(page.getByTestId('account-email')).toContainText(email)

  await page.locator('[data-user-menu]').click()
  await page.getByRole('complementary').getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/en\/sign-in$/)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/en/my-pages')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
})

test('profile fields are validated on every write path Better Auth exposes', async ({ page }) => {
  const unique = () => `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
  // A junk phone or an over-long name is refused, and no account is made. (These go first,
  // while the request context has no session: Better Auth origin-checks requests with one.)
  for (const [data, code] of [
    [{ name: 'A', phone: 'call me maybe' }, 'INVALID_PHONE'],
    [{ name: 'x'.repeat(201) }, 'NAME_TOO_LONG'],
  ] as const) {
    const bad = unique()
    const res = await page.request.post('/api/account/sign-up/email', { data: { ...data, email: bad, password: PASSWORD } })
    expect(res.status()).toBe(400)
    expect((await res.json()).code).toBe(code)
    expect(await db.select().from(schema.user).where(eq(schema.user.email, bad))).toEqual([])
  }

  // Sign-up tidies and narrows: a prototype key as the language is stored as Icelandic.
  const email = unique()
  const ok = await page.request.post('/api/account/sign-up/email', {
    data: { name: '  Anna   B ', email, password: PASSWORD, phone: ' 555 1234 ', preferredLocale: '__proto__' },
  })
  expect(ok.ok(), await ok.text()).toBe(true)
  const [row] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  expect([row.name, row.phone, row.preferredLocale]).toEqual(['Anna B', '555 1234', 'is'])

  // The generic update endpoint is off: the account page's own action is the only way to edit.
  // Signed in now (sign-up signs in), with a same-origin Origin, so only the disabled path can refuse it.
  const origin = new URL(test.info().project.use.baseURL!).origin
  const update = await page.request.post('/api/account/update-user', {
    data: { preferredLocale: '__proto__' },
    headers: { Origin: origin },
  })
  expect(update.status()).toBe(404)
  const [after] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  expect(after.preferredLocale).toBe('is')
})
