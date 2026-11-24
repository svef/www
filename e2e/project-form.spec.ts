import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { actAs, closeAwardsPool, createUser, lockTokenOf, makeEditor, markSubmitted } from './awards-session'
import { settle, urlFor } from './pages'
import { currentStep, goToStep, stepLink, stepper } from './project-steps'

/**
 * The project form: creating a project, autosave, the edit lock with two people, lock
 * expiry (the server clock is shifted for one user through the test-session cookie, so
 * nothing waits twenty minutes), and fields locked after submit.
 *
 * Runs against the real database and a server started with `AWARDS_TEST_SESSION=1`
 * (the Playwright config does both). Every test makes its own users and project.
 */
test.afterAll(closeAwardsPool)

const baseURL = () => test.info().project.use.baseURL as string

async function person(browser: Browser, name: string, clock?: number) {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = await createUser(name)
  await actAs(context, baseURL(), id, clock)
  return { context, id, page: await context.newPage() }
}

/** Creates a project as the page's user and returns its id, with the form open and the lock held. */
async function startProject(page: Page, locale: 'is' | 'en' = 'en') {
  await page.goto(urlFor(locale, '/innsendingar/ny'))
  await page.getByRole('button', { name: locale === 'en' ? 'Create project' : 'Stofna verkefni' }).click()
  await page.waitForURL(/\/innsendingar\/[0-9a-f-]{36}$|\/submissions\/[0-9a-f-]{36}$/)
  const id = page.url().split('/').pop()!
  await expect(page.locator('[data-lock="held"]')).toBeVisible()
  return id
}

const SAVED = /^Saved/

test.describe('the project form', () => {
  test('is reached from "New submission", opens read-write, and shows the seven steps one at a time', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    const id = await startProject(page)
    await expect(stepper(page).getByRole('link')).toHaveCount(7)
    // Every step is in the page, in order; only the current one is shown.
    await expect(page.locator('section[data-step] h2')).toHaveText([
      'Categories',
      'The project',
      'Category questions',
      'People and credit',
      'Image',
      'Billing',
      'Review and submit',
    ])
    await expect(page.locator('section[data-step]:not([hidden])')).toHaveCount(1)
    await expect(currentStep(page).locator('h2')).toHaveText('Categories')
    await expect(stepLink(page, 'Categories')).toHaveAttribute('aria-current', 'step')

    // Next: the step changes, the heading takes focus, the hash says where we are.
    await currentStep(page).getByRole('link', { name: /^Next/ }).click()
    await expect(currentStep(page).locator('h2')).toHaveText('The project')
    await expect(currentStep(page).locator('h2')).toBeFocused()
    await expect(stepLink(page, 'The project')).toHaveAttribute('aria-current', 'step')
    await expect(stepLink(page, 'Categories')).not.toHaveAttribute('aria-current', 'step')
    expect(new URL(page.url()).hash).toBe('#section-project')
    await expect(page.locator('[data-step-announce]')).toHaveText('Step 2 of 7: The project')

    // Any step can be opened at any time, in any order.
    await goToStep(page, 'Review and submit')
    await expect(currentStep(page).getByRole('link', { name: /^Next/ })).toHaveCount(0)
    await currentStep(page).getByRole('link', { name: /^Previous/ }).click()
    await expect(currentStep(page).locator('h2')).toHaveText('Billing')

    // Reload keeps the step; back and forward walk the steps.
    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(currentStep(page).locator('h2')).toHaveText('Billing')
    await page.goBack()
    await expect(currentStep(page).locator('h2')).toHaveText('Review and submit')
    await page.goBack()
    await expect(currentStep(page).locator('h2')).toHaveText('The project')
    await page.goForward()
    await expect(currentStep(page).locator('h2')).toHaveText('Review and submit')

    // A link straight to a field opens its step and focuses it.
    await page.goto(urlFor('en', `/innsendingar/${id}#field-publicCredit`))
    await expect(currentStep(page).locator('h2')).toHaveText('People and credit')
    await expect(page.locator('[data-field="publicCredit"] input')).toBeFocused()
    await context.close()
  })

  test('keeps the step bar at the foot of the screen on a long step, with the total in it on the categories step', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await page.setViewportSize({ width: 1280, height: 720 })
    await startProject(page)
    const bar = currentStep(page).locator('[data-step-nav]')
    const viewport = page.viewportSize()!
    const section = currentStep(page)

    // Before scrolling: the step runs past the screen, and the bar sits on its bottom edge,
    // the running total and Next in the one bar.
    expect((await section.boundingBox())!.height).toBeGreaterThan(viewport.height)
    await expect(bar).toBeVisible()
    await expect(bar.locator('[data-total]')).toBeVisible()
    await expect(bar.getByRole('link', { name: /^Next/ })).toBeVisible()
    await expect(page.locator('[data-total]:visible')).toHaveCount(1)
    const stuck = (await bar.boundingBox())!
    expect(Math.abs(stuck.y + stuck.height - viewport.height)).toBeLessThanOrEqual(1)

    // At the end of the step it rests in place, under the last block.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect(async () => {
      const rest = (await bar.boundingBox())!
      const end = (await section.boundingBox())!
      expect(Math.abs(rest.y + rest.height - (end.y + end.height))).toBeLessThanOrEqual(1)
      expect(rest.y + rest.height).toBeLessThan(viewport.height - 1)
    }).toPass()

    // A field taken to with the keyboard is never left under the bar.
    await page.setViewportSize({ width: 390, height: 640 })
    await goToStep(page, 'The project')
    await page.locator('[data-field="title"] input').focus()
    const description = page.locator('[data-field="description"] textarea')
    for (let i = 0; i < 4 && !(await description.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab')
    await expect(description).toBeFocused()
    const field = (await description.boundingBox())!
    const over = (await currentStep(page).locator('[data-step-nav]').boundingBox())!
    expect(field.y + field.height).toBeLessThanOrEqual(over.y + 1)
    await context.close()
  })

  test('autosaves a second after typing stops and keeps the answers across a reload', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    const id = await startProject(page)

    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await expect(page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()

    await goToStep(page, 'The project')
    await page.locator('[data-field="title"] input').fill('Brand new site')
    await expect(page.getByRole('status').filter({ hasText: 'Saving…' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()

    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(page.locator('[data-field="title"] input')).toHaveValue('Brand new site')
    await goToStep(page, 'Categories')
    await expect(page.getByRole('checkbox', { name: 'Marketing Website' })).toBeChecked()
    expect(page.url()).toContain(id)
    await context.close()
  })

  test('shows no error until a field has been left', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await goToStep(page, 'The project')
    const field = page.locator('[data-field="title"]')
    await expect(field.locator('[id$="-error"]')).toHaveCount(0)
    await field.locator('input').focus()
    await expect(field.locator('[id$="-error"]')).toHaveCount(0)
    await field.locator('input').blur()
    await expect(field.locator('[id$="-error"]')).toHaveText('This field is required.')
    await context.close()
  })

  test('has no axe violations on any step', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    for (const step of [
      'Categories',
      'The project',
      'Category questions',
      'People and credit',
      'Image',
      'Billing',
      'Review and submit',
    ]) {
      await goToStep(page, step)
      await settle(page)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(
        results.violations.map((v) => `${step}: ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      ).toEqual([])
    }
    await context.close()
  })

  test('one person edits; the other sees who and since when, read-only, until the first leaves', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const id = await startProject(anna.page)
    await anna.page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await expect(anna.page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()

    const bjarni = await person(browser, 'Bjarni')
    await makeEditor(id, bjarni.id)
    await bjarni.page.goto(urlFor('en', `/innsendingar/${id}`))
    const banner = bjarni.page.locator('[data-lock="other"]')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(/Anna is editing this project \(since \d\d:\d\d\)/)
    await expect(bjarni.page.locator('[data-field="title"] input')).toHaveAttribute('readonly', '')
    await expect(bjarni.page.getByRole('checkbox', { name: 'Marketing Website' })).toBeDisabled()
    // What Anna saved is visible to him.
    await expect(bjarni.page.getByRole('checkbox', { name: 'Marketing Website' })).toBeChecked()

    // Anna leaves; the beacon releases her lock, and Bjarni can take it.
    await anna.page.goto('about:blank')
    await expect(async () => {
      await bjarni.page.getByRole('button', { name: 'Check again' }).click()
      await expect(bjarni.page.locator('[data-lock="held"]')).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 15_000 })
    await expect(bjarni.page.locator('[data-field="title"] input')).not.toHaveAttribute('readonly', '')
    await anna.context.close()
    await bjarni.context.close()
  })

  test('reloading the page keeps the lock: the old page\'s late release beacon cannot delete the new one\'s', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    const id = await startProject(page)
    const before = await lockTokenOf(id)
    expect(before).toBeTruthy()

    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    // The reload took the lock again, with a token of its own.
    await expect.poll(() => lockTokenOf(id)).not.toBe(before)
    const after = await lockTokenOf(id)
    expect(after).toBeTruthy()

    // The old page's beacon, arriving after the new page took the lock: a no-op.
    const stale = await context.request.post(`/api/awards/projects/${id}/lock`, {
      data: before!,
      headers: { 'content-type': 'text/plain' },
    })
    expect(stale.status()).toBe(204)
    expect(await lockTokenOf(id)).toBe(after)
    await expect(page.locator('[data-lock="held"]')).toBeVisible()

    // Its own token still releases it.
    await context.request.post(`/api/awards/projects/${id}/lock`, {
      data: after!,
      headers: { 'content-type': 'text/plain' },
    })
    expect(await lockTokenOf(id)).toBeNull()
    await context.close()
  })

  test('refuses to take a live lock, however many times it is asked', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const id = await startProject(anna.page)
    const bjarni = await person(browser, 'Bjarni')
    await makeEditor(id, bjarni.id)
    await bjarni.page.goto(urlFor('en', `/innsendingar/${id}`))
    await expect(bjarni.page.locator('[data-lock="other"]')).toBeVisible()
    for (let i = 0; i < 3; i++) {
      await bjarni.page.getByRole('button', { name: 'Check again' }).click()
      await expect(bjarni.page.locator('[data-lock="other"]')).toBeVisible()
    }
    await anna.context.close()
    await bjarni.context.close()
  })

  test('an expired lock can be taken; the lapsed editor keeps her text and is told who has it', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const id = await startProject(anna.page)
    await anna.page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await expect(anna.page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()

    // Bjarni's requests run 21 minutes ahead: to the server, Anna's lock has lapsed.
    const bjarni = await person(browser, 'Bjarni', 21 * 60 * 1000)
    await makeEditor(id, bjarni.id)
    await bjarni.page.goto(urlFor('en', `/innsendingar/${id}`))
    await expect(bjarni.page.locator('[data-lock="held"]')).toBeVisible()

    // Anna types on, unaware. Her save is refused, her text stays, and she sees who has it.
    await goToStep(anna.page, 'The project')
    await anna.page.locator('[data-field="title"] input').fill('Typed after losing the lock')
    await expect(anna.page.locator('[data-lock="other"]')).toBeVisible({ timeout: 10_000 })
    await expect(anna.page.locator('[data-lock="other"]')).toContainText('Bjarni is editing this project')
    await expect(anna.page.getByRole('status').filter({ hasText: 'Not saved — someone else is editing' })).toBeVisible()
    await expect(anna.page.locator('[data-field="title"] input')).toHaveValue('Typed after losing the lock')

    // Nothing of hers reached the project.
    await bjarni.page.reload()
    await expect(bjarni.page.locator('[data-field="title"] input')).toHaveValue('')
    await anna.context.close()
    await bjarni.context.close()
  })

  test('a lapsed editor whom nobody replaced takes the lock back and her text is saved', async ({ browser }) => {
    // Anna's own requests run 21 minutes behind her last activity only through the cookie,
    // so: she acts, then her clock jumps past expiry; nobody else is there to take it.
    const anna = await person(browser, 'Anna')
    const id = await startProject(anna.page)
    await anna.page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await expect(anna.page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()
    await actAs(anna.context, baseURL(), anna.id, 21 * 60 * 1000)

    await goToStep(anna.page, 'The project')
    await anna.page.locator('[data-field="title"] input').fill('Saved after a lapse')
    await expect(anna.page.getByRole('status').filter({ hasText: SAVED })).toBeVisible({ timeout: 10_000 })
    await expect(anna.page.locator('[data-lock="held"]')).toBeVisible()
    await anna.page.reload()
    await expect(anna.page.locator('[data-field="title"] input')).toHaveValue('Saved after a lapse')
    expect(id).toBeTruthy()
    await anna.context.close()
  })

  test('fields locked after submit are read-only with an explanation; editable ones are not', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const id = await startProject(anna.page)
    await anna.page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await expect(anna.page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()
    await markSubmitted(id)
    await anna.page.reload()
    await expect(anna.page.locator('[data-lock="held"]')).toBeVisible()

    await goToStep(anna.page, 'The project')
    const locked = anna.page.locator('[data-field="title"]')
    await expect(locked.locator('input')).toHaveAttribute('readonly', '')
    await locked.getByText('Why can’t I edit this?').click()
    await expect(locked).toContainText('withdraw the entry')
    await expect(anna.page.locator('[data-field="publicCredit"] input')).not.toHaveAttribute('readonly', '')
    await expect(anna.page.locator('[data-field="publicCredit"]')).not.toContainText('Why can’t I edit this?')
    await anna.context.close()
  })

  test('works in Icelandic', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page, 'is')
    expect(new URL(page.url()).pathname).toMatch(/^\/is\/innsendingar\//)
    await expect(page.getByRole('navigation', { name: 'Hlutar' })).toBeVisible()
    await context.close()
  })

  test('is not reachable by someone who is not on the project', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const id = await startProject(anna.page)
    const stranger = await person(browser, 'Stranger')
    const res = await stranger.page.goto(urlFor('en', `/innsendingar/${id}`))
    expect(res?.status()).toBe(404)
    await anna.context.close()
    await stranger.context.close()
  })

  test('sends someone who is not signed in to sign in, and back afterwards', async ({ page }) => {
    await page.goto(urlFor('en', '/innsendingar/ny'))
    await expect(page).toHaveURL(/\/en\/sign-in\?next=/)
    expect(decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '')).toBe('/en/submissions/new')
  })
})
