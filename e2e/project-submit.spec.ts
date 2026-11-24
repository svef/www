import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { actAs, awardsPool, closeAwardsPool, createUser, emailOf } from './awards-session'
import { urlFor } from './pages'

/**
 * Submitting: the terms, what blocks the button, the early-bird note, the confirmation
 * dialog, the lock on submitted fields, the receipt in the local email outbox, and a
 * single-entry submit for a category added later. Signed in through the test-session
 * cookie, with the server clock moved into the intake window (intake opens on 1 December
 * and the suite runs before that). Every test makes its own verified user and project.
 */
test.afterAll(closeAwardsPool)

const OUTBOX = path.resolve(process.cwd(), '.awards-outbox')
const baseURL = () => test.info().project.use.baseURL as string
const INTAKE_CLOCK = () => Date.parse('2026-12-15T12:00:00Z') - Date.now()
const SAVED = /^Saved/

async function person(browser: Browser, opts: { verified?: boolean; clock?: boolean } = {}) {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = await createUser('Anna', opts.verified ?? true)
  await actAs(context, baseURL(), id, opts.clock === false ? undefined : INTAKE_CLOCK())
  return { context, id, page: await context.newPage() }
}

async function startProject(page: Page) {
  await page.goto(urlFor('en', '/innsendingar/ny'))
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.waitForURL(/\/submissions\/[0-9a-f-]{36}$/)
  await expect(page.locator('[data-lock="held"]')).toBeVisible()
}
const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()

/** An App project with every required answer and a billing profile. */
async function fillApp(page: Page, title = 'The app') {
  await page.getByRole('checkbox', { name: 'App', exact: true }).check()
  await saved(page)
  await page.locator('[data-field="title"] input').fill(title)
  await page.locator('[data-field="description"] textarea').fill('A fine app.')
  await page.locator('[data-field="appLinks"] input').first().fill('https://example.is/app')
  const owner = page.locator('[data-field="owners"]').getByRole('group', { name: 'Owner 1' })
  await owner.getByLabel('Name').fill('Anna')
  await owner.getByLabel('Email').fill('anna@example.is')
  await page.locator('[data-field="publicCredit"] input').fill('Anna Ltd.')
  await saved(page)
  const billing = page.locator('#section-billing')
  await billing.getByRole('button', { name: 'Add a billing profile' }).click()
  const editor = billing.getByRole('group', { name: 'Add a billing profile' })
  await editor.getByLabel('Company name').fill('Acme ehf.')
  await editor.getByLabel('Kennitala').fill('7102031219')
  await editor.getByLabel('Invoice email').fill('invoices@example.is')
  await editor.getByLabel('Address').fill('Laugavegur 1')
  await editor.getByRole('button', { name: 'Save profile' }).click()
  await saved(page)
  await expect(page.locator('#section-review [data-missing-none]')).toBeVisible()
}

async function mailTo(to: string, subject: RegExp) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[]))
      .filter((f) => f.endsWith(`-${to}.json`))
      .sort()
    for (const f of files.reverse()) {
      const mail = JSON.parse(await readFile(path.join(OUTBOX, f), 'utf8')) as {
        subject: string
        text: string
      }
      if (subject.test(mail.subject)) return mail
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`no email to ${to} matching ${subject}`)
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Submit your entries?' })

test.describe('submit', () => {
  test('is blocked until the terms are accepted, and explains the early bird next to the button', async ({
    browser,
  }) => {
    const { context, page } = await person(browser)
    await startProject(page)
    await fillApp(page)
    const panel = page.locator('[data-submit-panel]')

    await expect(panel.locator('[data-early-explain]')).toHaveText(
      'Submit by the end of 4 January 2027 to secure the early-bird price, 18,900 kr. instead of 26,900 kr.',
    )
    await expect(panel.locator('[data-terms]')).toContainText('Version draft')
    await expect(panel.locator('[data-terms]')).toContainText('Draft text')
    await expect(panel.locator('[data-terms]')).toContainText('not refunded')

    // Blocked: the button says why, with a link to what is left.
    const button = panel.locator('[data-submit]')
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    // Playwright treats aria-disabled as disabled; a person can still press it.
    await button.click({ force: true })
    await expect(dialog(page)).toHaveCount(0)
    const blockers = panel.locator('[data-submit-blockers]')
    await expect(blockers).toBeFocused()
    await expect(blockers.getByRole('link', { name: 'Accept the competition terms' })).toBeVisible()

    await page.getByRole('checkbox', { name: /I accept the competition terms/ }).check()
    await expect(button).toHaveAttribute('aria-disabled', 'false')
    await expect(blockers).toHaveCount(0)
    await context.close()
  })

  test('lists what is missing, each item linking to its field', async ({ browser }) => {
    const { context, page } = await person(browser)
    await startProject(page)
    await page.getByRole('checkbox', { name: 'App', exact: true }).check()
    await saved(page)
    const blockers = page.locator('[data-submit-blockers]')
    await expect(blockers).toContainText('Project title')
    await blockers.locator('[data-blocker-key="title"]').click()
    await expect(page.locator('[data-field="title"] input')).toBeFocused()
    await expect(blockers.locator('[data-blocker-key="billing"]')).toBeVisible()
    await context.close()
  })

  test('shows the confirmation dialog, closes on Escape, keeps focus inside, and has no axe violations', async ({
    browser,
  }) => {
    const { context, page } = await person(browser)
    await startProject(page)
    await fillApp(page)
    await page.getByRole('checkbox', { name: /I accept the competition terms/ }).check()
    const button = page.locator('[data-submit]')
    await button.click()

    const d = dialog(page)
    await expect(d).toBeVisible()
    await expect(d.locator('[data-dialog-price="app"]')).toContainText('18,900 kr.')
    await expect(d.locator('[data-dialog-price="app"]')).toContainText('early-bird price')
    await expect(d.locator('[data-dialog-total]')).toHaveText('18,900 kr.')
    await expect(d.locator('[data-dialog-editable]')).toContainText('App links')
    await expect(d.locator('[data-dialog-editable]')).toContainText('Public credit')
    await expect(d.locator('[data-dialog-locked]')).toContainText('Project title')
    await expect(d.locator('[data-dialog-locked]')).toContainText('Project description')
    await expect(d.locator('[data-dialog-locked]')).toContainText('Project owner')
    await expect(d.locator('[data-dialog-withdraw]')).toContainText(
      'withdrawing the entry, and that gives up the early-bird price',
    )
    await expect(d.locator('[data-dialog-withdraw]')).toContainText('after 4 January 2027')

    // Focus stays in the dialog however far Tab goes.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
    }

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    await page.keyboard.press('Escape')
    await expect(d).toHaveCount(0)
    await expect(button).toBeFocused()
    await context.close()
  })

  test('submits, locks the price and the answers, sends the receipt, keeps editable fields saving', async ({
    browser,
  }) => {
    const { context, page, id } = await person(browser)
    await startProject(page)
    await fillApp(page, 'Fjallavefurinn')
    await page.getByRole('checkbox', { name: /I accept the competition terms/ }).check()
    await page.locator('[data-submit]').click()
    await dialog(page).locator('[data-confirm-submit]').click()

    const done = page.locator('[data-submit-done]')
    await expect(done).toBeVisible()
    await expect(done).toContainText('1 entry submitted')
    await expect(done).toContainText('App: 18,900 kr. (early-bird price, locked)')
    await expect(done).toContainText('The prices are locked and will not change.')
    await expect(done).toBeFocused()
    await expect(page.locator('[data-entry-row="app"]')).toContainText('Submitted')
    await expect(page.locator('[data-entry-row="app"]')).toContainText('18,900 kr.')
    // The button and terms are gone: nothing is left to submit.
    await expect(page.locator('[data-submit]')).toHaveCount(0)

    // The receipt: entries, locked prices, total, billing, the invoice note.
    const mail = await mailTo(await emailOf(id), /^Receipt: Fjallavefurinn/)
    expect(mail.text).toContain('App: 18,900 kr. (early-bird price)')
    expect(mail.text).toContain('Total: 18,900 kr.')
    expect(mail.text).toContain('Acme ehf.')
    expect(mail.text).toMatch(/invoice is sent after submissions close/)

    // Locked fields are read-only with the explanation; editable ones are not.
    const title = page.locator('[data-field="title"]')
    await expect(title.locator('input')).toHaveAttribute('readonly', '')
    await expect(title).toContainText('Why can’t I edit this?')
    await expect(page.locator('[data-field="appLinks"] input').first()).not.toHaveAttribute(
      'readonly',
      '',
    )

    // An editable field keeps autosaving, and the change is logged.
    await page.locator('[data-field="publicCredit"] input').fill('Anna Ltd. and friends')
    await saved(page)
    await expect
      .poll(async () => {
        const { rows } = await awardsPool().query(
          `select count(*)::int as n from entry_event e join project p on p.id = e.project_id
           where p.created_by = $1 and e.type = 'field_changed' and e.field_key = 'publicCredit'`,
          [id],
        )
        return rows[0].n
      })
      .toBe(2)

    // Reloading shows the same, from the server.
    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(page.locator('[data-entry-row="app"]')).toContainText('Submitted')
    await expect(page.locator('[data-field="title"] input')).toHaveAttribute('readonly', '')
    await context.close()
  })

  test('submits a single entry for a category added later, at its own price', async ({
    browser,
  }) => {
    const { context, page } = await person(browser)
    await startProject(page)
    await fillApp(page)
    await page.getByRole('checkbox', { name: /I accept the competition terms/ }).check()
    await page.locator('[data-submit]').click()
    await dialog(page).locator('[data-confirm-submit]').click()
    await expect(page.locator('[data-submit-done]')).toBeVisible()

    // Add a category: a new draft, whose own questions are open until it is submitted.
    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await saved(page)
    await expect(page.locator('[data-entry-row="marketing-website"]')).toContainText('Draft')
    const entryButton = page.locator('[data-submit-entry="marketing-website"]')
    await expect(entryButton).toHaveAttribute('aria-disabled', 'true')
    await entryButton.click({ force: true })
    const blockers = page.locator('[data-submit-blockers]')
    await expect(blockers).toContainText('Campaign period')
    await expect(blockers).toContainText('Project links')

    await page.locator('[data-field="links"] input').first().fill('https://example.is')
    const period = page.locator('[data-field="campaignPeriod"]')
    await period.getByLabel('From').fill('2026-05-01')
    await period.getByLabel('To').fill('2026-06-01')
    await saved(page)
    // Terms were accepted for this project already: no checkbox again.
    await expect(page.locator('[data-terms-accepted]')).toBeVisible()
    await expect(entryButton).toHaveAttribute('aria-disabled', 'false')
    await entryButton.click()

    const d = dialog(page)
    await expect(d.locator('[data-dialog-price="marketing-website"]')).toContainText('18,900 kr.')
    await expect(d.locator('[data-dialog-price]')).toHaveCount(1) // only this entry
    await d.locator('[data-confirm-submit]').click()
    await expect(page.locator('[data-submit-done]')).toContainText('1 entry submitted')
    await expect(page.locator('[data-entry-row="marketing-website"]')).toContainText('Submitted')
    await expect(page.locator('[data-entry-row="app"]')).toContainText('Submitted')
    await expect(page.locator('[data-submit-entry]')).toHaveCount(0)
    await context.close()
  })

  test('asks an unverified account to verify, and can send the email again', async ({ browser }) => {
    const { context, page, id } = await person(browser, { verified: false })
    await startProject(page)
    await fillApp(page)
    await page.getByRole('checkbox', { name: /I accept the competition terms/ }).check()
    const notice = page.locator('[data-verify-notice]')
    await expect(notice).toContainText('Verify your email to submit')
    await expect(page.locator('[data-submit]')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-submit-blockers]')).toContainText('Verify your email to submit')

    await notice.getByRole('button', { name: 'Send the confirmation email again' }).click()
    await expect(notice.getByRole('status')).toHaveText('Sent. Check your inbox.')
    const mail = await mailTo(await emailOf(id), /Confirm your email address|Staðfestu netfangið/)
    expect(mail.text).toMatch(/https?:\/\//)
    await context.close()
  })

  test('says when submissions have not opened yet', async ({ browser }) => {
    const { context, page } = await person(browser, { clock: false })
    await startProject(page)
    await fillApp(page)
    await page.getByRole('checkbox', { name: /I accept the competition terms/ }).check()
    await expect(page.locator('[data-submit-blockers]')).toContainText(
      'Submissions open on 1 December 2026.',
    )
    await expect(page.locator('[data-submit]')).toHaveAttribute('aria-disabled', 'true')
    await context.close()
  })

  test('is in Icelandic on the Icelandic page', async ({ browser }) => {
    const { context, page } = await person(browser)
    await page.goto(urlFor('is', '/innsendingar/ny'))
    await page.getByRole('button', { name: 'Stofna verkefni' }).click()
    await page.waitForURL(/\/innsendingar\/[0-9a-f-]{36}$/)
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await page.getByRole('checkbox', { name: 'App', exact: true }).check()
    await expect(page.locator('[data-submit]')).toHaveText('Senda inn')
    await expect(page.locator('[data-early-explain]')).toContainText(
      /til að tryggja snemmskráningarverðið, 18.900 kr. í stað 26.900 kr.$/,
    )
    await context.close()
  })
})
