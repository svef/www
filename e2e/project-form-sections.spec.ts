import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { actAs, closeAwardsPool, createUser } from './awards-session'
import { settle, urlFor } from './pages'

/**
 * The seven sections of the project form: choosing categories (tiers, exclusions, the
 * running total), the project fields and the forced login toggle, category questions,
 * owners and collaborators, the image placeholder, billing profiles, and the review's
 * missing-items list. Signed in through the test-session cookie; every test makes its
 * own user and project.
 */
test.afterAll(closeAwardsPool)

const baseURL = () => test.info().project.use.baseURL as string
const SAVED = /^Saved/

async function person(browser: Browser, name: string) {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = await createUser(name)
  await actAs(context, baseURL(), id)
  return { context, id, page: await context.newPage() }
}

async function startProject(page: Page, locale: 'is' | 'en' = 'en') {
  await page.goto(urlFor(locale, '/innsendingar/ny'))
  await page
    .getByRole('button', { name: locale === 'en' ? 'Create project' : 'Stofna verkefni' })
    .click()
  await page.waitForURL(/\/innsendingar\/[0-9a-f-]{36}$|\/submissions\/[0-9a-f-]{36}$/)
  await expect(page.locator('[data-lock="held"]')).toBeVisible()
}
const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: SAVED })).toBeVisible()
const outline = (page: Page, title: string) =>
  page
    .getByRole('navigation', { name: 'Sections' })
    .getByRole('link', { name: new RegExp(`^${title}`) })

test.describe('categories', () => {
  test('are choice cards with a description, a size choice for the group, and a running total', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)

    const card = page.locator('[data-choice="marketing-website"]')
    await expect(card).toContainText('Campaigns, events and microsites')
    await expect(card.locator('details')).not.toHaveAttribute('open', '')
    await card.getByText('Full description').click()
    await expect(card.locator('details')).toHaveAttribute('open', '')

    // The group's four sizes are a radio group, not a dropdown.
    const group = page.locator('[data-choice="company-website"]')
    await expect(group.getByRole('radiogroup')).toBeVisible()
    await expect(group.getByRole('radio')).toHaveCount(4)
    await expect(page.locator('select')).toHaveCount(0)

    await expect(page.locator('[data-total]')).toContainText('Choose a category to see the price.')
    await group.getByRole('radio', { name: 'Medium' }).check()
    await saved(page)
    await expect(page.locator('[data-total-early]')).toHaveText('18,900 kr.')
    await expect(page.locator('[data-total-regular]')).toHaveText('26,900 kr.')

    await page.getByRole('checkbox', { name: 'Student Project' }).check()
    await saved(page)
    await expect(page.locator('[data-total-early]')).toHaveText('20,800 kr.')
    await expect(page.locator('[data-total-regular]')).toHaveText('29,800 kr.')

    // Switching size replaces the choice: still one tier in the group.
    await group.getByRole('radio', { name: 'Large' }).check()
    await saved(page)
    await expect(group.getByRole('radio', { name: 'Large' })).toBeChecked()
    await expect(group.getByRole('radio', { name: 'Medium' })).not.toBeChecked()
    await expect(page.locator('[data-total-regular]')).toHaveText('41,800 kr.')

    // And it is what was saved.
    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(
      page.locator('[data-choice="company-website"]').getByRole('radio', { name: 'Large' }),
    ).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Student Project' })).toBeChecked()

    await page
      .locator('[data-choice="company-website"]')
      .getByRole('button', { name: 'Don’t enter in Company Website' })
      .click()
    await saved(page)
    await expect(group.getByRole('radio', { name: 'Large' })).not.toBeChecked()
    await expect(page.locator('[data-total-regular]')).toHaveText('2,900 kr.')
    await context.close()
  })

  test('grey out an excluded combination and say why', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'Student Project' }).check()
    await saved(page)

    const passion = page.getByRole('checkbox', { name: 'Passion Project' })
    await expect(passion).toBeDisabled()
    const card = page.locator('[data-choice="passion-project"]')
    await expect(card).toHaveAttribute('data-blocked', '')
    await expect(card).toContainText("This category can't be combined with “Student Project”.")
    // The reason is tied to the control for assistive technology.
    const describedBy = await passion.getAttribute('aria-describedby')
    expect(describedBy).toContain('why-passion-project')

    await page.getByRole('checkbox', { name: 'Student Project' }).uncheck()
    await saved(page)
    await expect(passion).toBeEnabled()
    await expect(card).not.toContainText('can’t be combined')
    await context.close()
  })

  test('tick the outline once one is chosen', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await expect(outline(page, 'Categories')).not.toContainText('(complete)')
    await page.getByRole('checkbox', { name: 'App', exact: true }).check()
    await saved(page)
    await expect(outline(page, 'Categories')).toContainText('(complete)')
    await context.close()
  })
})

test.describe('the project', () => {
  test('forces the login toggle on and locks it for Logged-In Platform, with the reason', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await saved(page)

    const toggle = page.locator('[data-field="requiresLogin"] input[type="checkbox"]')
    await expect(toggle).not.toBeChecked()
    await expect(toggle).toBeEnabled()
    await expect(page.locator('[data-field="loginInformation"]')).toHaveCount(0)

    await page.getByRole('checkbox', { name: 'Logged-In Platform' }).check()
    await saved(page)
    await expect(toggle).toBeChecked()
    await expect(toggle).toBeDisabled()
    await expect(page.locator('[data-field="requiresLogin"]')).toContainText(
      'Always on, because the Logged-In Platform category needs a login.',
    )
    // Turned on, it reveals the login details, which stay on across a reload.
    const login = page.locator('[data-field="loginInformation"]')
    await expect(login).toBeVisible()
    await login.getByLabel('Account or instructions').fill('demo@example.com / correct horse')
    await login.getByLabel('Label').fill('Demo account')
    await saved(page)
    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(toggle).toBeChecked()
    await expect(toggle).toBeDisabled()
    await expect(
      page.locator('[data-field="loginInformation"]').getByLabel('Account or instructions'),
    ).toHaveValue('demo@example.com / correct horse')

    // Without the category the toggle is free again.
    await page.getByRole('checkbox', { name: 'Logged-In Platform' }).uncheck()
    await saved(page)
    await expect(toggle).toBeEnabled()
    await context.close()
  })

  test('puts the anonymity rule behind a tip on the description, and shows links per category', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await saved(page)

    const field = page.locator('[data-field="description"]')
    const tip = field.getByRole('button', { name: 'More information' })
    await expect(tip).toHaveAttribute('aria-expanded', 'false')
    await tip.click()
    await expect(tip).toHaveAttribute('aria-expanded', 'true')
    await expect(
      field
        .locator('[aria-hidden="true"]')
        .filter({ hasText: 'The jury doesn’t see who made the project' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tip).toHaveAttribute('aria-expanded', 'false')
    // The rule is part of the textarea's description either way.
    const described = await field.locator('textarea').getAttribute('aria-describedby')
    expect(described).toMatch(/-tip/)

    await expect(page.locator('[data-field="links"]')).toBeVisible()
    await expect(page.locator('[data-field="appLinks"]')).toHaveCount(0)
    await page.getByRole('checkbox', { name: 'Marketing Website' }).uncheck()
    await page.getByRole('checkbox', { name: 'App', exact: true }).check()
    await saved(page)
    await expect(page.locator('[data-field="appLinks"]')).toBeVisible()
    await expect(page.locator('[data-field="links"]')).toHaveCount(0)
    await context.close()
  })
})

test.describe('category questions', () => {
  test('appear for the chosen categories and go with them; the pitch is collapsed until asked for', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    const section = page.locator('#section-questions')
    await expect(section).toContainText('Choose at least one category first.')

    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await saved(page)
    await expect(section.locator('[data-field="campaignPeriod"]')).toBeVisible()
    await expect(section.locator('[data-field="campaignArchive"]')).toBeVisible()
    await expect(section.locator('[data-field="aiRole"]')).toHaveCount(0)

    await page.getByRole('checkbox', { name: 'AI Solution' }).check()
    await saved(page)
    await expect(section.locator('[data-field="aiRole"]')).toBeVisible()
    await expect(section.locator('[data-category="ai-solution"] h3')).toHaveText('AI Solution')

    await page.getByRole('checkbox', { name: 'Student Project' }).check()
    await saved(page)
    await expect(section.locator('[data-field="school"]')).toBeVisible()
    await expect(section.locator('[data-field="programme"]')).toBeVisible()

    await page.getByRole('checkbox', { name: 'AI Solution' }).uncheck()
    await saved(page)
    await expect(section.locator('[data-field="aiRole"]')).toHaveCount(0)

    // The pitch: collapsed by default, one per entry, saved per entry.
    const pitch = section.locator('details[data-entry="marketing-website"]')
    await expect(pitch).not.toHaveAttribute('open', '')
    await expect(pitch.locator('summary')).toHaveText('Add a note for the Marketing Website jury')
    await pitch.locator('summary').click()
    await pitch.getByLabel('Why this category?').fill('It was a campaign first.')
    await saved(page)
    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    const again = page.locator('#section-questions details[data-entry="marketing-website"]')
    await expect(again).toHaveAttribute('open', '')
    await expect(again.getByLabel('Why this category?')).toHaveValue('It was a campaign first.')
    await expect(
      page.locator('#section-questions details[data-entry="student-project"]'),
    ).not.toHaveAttribute('open', '')
    await context.close()
  })
})

test.describe('people and credit', () => {
  test('add, reorder and remove owners and collaborators, with the email rule for editors', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    const owners = page.locator('[data-field="owners"]')
    await expect(owners.getByRole('group', { name: 'Owner 1' })).toBeVisible()
    // One owner is required: nothing to remove, nothing to reorder.
    await expect(owners.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
    await expect(owners.getByRole('button', { name: /^Move/ })).toHaveCount(0)

    await owners.getByRole('group', { name: 'Owner 1' }).getByLabel('Name').fill('Anna')
    await owners.getByRole('group', { name: 'Owner 1' }).getByLabel('Email').fill('anna@example.is')
    await owners.getByRole('button', { name: 'Add an owner' }).click()
    // Focus lands in the new row.
    await expect(owners.getByRole('group', { name: 'Owner 2' }).getByLabel('Name')).toBeFocused()
    await owners.getByRole('group', { name: 'Owner 2' }).getByLabel('Name').fill('Bjarni')
    await owners
      .getByRole('group', { name: 'Owner 2' })
      .getByLabel('Email')
      .fill('bjarni@example.is')

    await owners.getByRole('button', { name: 'Move Owner 2 up' }).click()
    await expect(owners.getByRole('status')).toHaveText('Bjarni moved to position 1 of 2.')
    await expect(owners.getByRole('group', { name: 'Owner 1' }).getByLabel('Name')).toHaveValue(
      'Bjarni',
    )
    // Focus stays on the button that was used, now in its new row.
    await expect(owners.getByRole('button', { name: 'Move Owner 1 down' })).toBeFocused()
    await saved(page)

    const collab = page.locator('[data-field="collaborators"]')
    await expect(collab.getByRole('group')).toHaveCount(0) // optional: none until asked for
    await collab.getByRole('button', { name: 'Add a collaborator' }).click()
    const c1 = collab.getByRole('group', { name: 'Collaborator 1' })
    await c1.getByLabel('Name').fill('Katrín')
    await c1.getByLabel('Role').fill('Design')
    await c1.getByLabel('Can edit').check()
    await expect(c1).toContainText('An email is needed to send the invitation.')
    // Nothing red yet: the hint is neutral until the email field is left.
    await expect(collab.locator('[id$="-error"]')).toHaveCount(0)
    await c1.getByLabel('Email', { exact: true }).fill('katrin@example.is')
    await expect(c1).not.toContainText('An email is needed')
    await saved(page)

    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(owners.getByRole('group', { name: 'Owner 1' }).getByLabel('Name')).toHaveValue(
      'Bjarni',
    )
    await expect(owners.getByRole('group', { name: 'Owner 2' }).getByLabel('Name')).toHaveValue(
      'Anna',
    )
    await expect(
      collab.getByRole('group', { name: 'Collaborator 1' }).getByLabel('Can edit'),
    ).toBeChecked()

    await owners.getByRole('button', { name: 'Remove Owner 1' }).click()
    await saved(page)
    await expect(owners.getByRole('group')).toHaveCount(1)
    await expect(owners.getByRole('group', { name: 'Owner 1' }).getByLabel('Name')).toHaveValue(
      'Anna',
    )
    await collab.getByRole('button', { name: 'Remove Collaborator 1' }).click()
    await saved(page)
    await expect(collab.getByRole('group')).toHaveCount(0)
    await context.close()
  })
})

test.describe('image', () => {
  test('is a marked placeholder with the requirements and a disabled control', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    const image = page.locator('#section-image')
    await expect(image).toContainText('Square, 1080 × 1080 px, PNG / JPG, up to 10 MB.')
    await expect(image.getByText('Coming', { exact: true })).toBeVisible()
    await expect(image.locator('input[type="file"]')).toBeDisabled()
    await expect(image.locator('[data-state="coming"]')).toBeVisible()
    await context.close()
  })
})

test.describe('billing', () => {
  const kt = '4710031239'

  async function addProfile(
    page: Page,
    name: string,
    kennitala: string,
    email = 'invoices@example.is',
  ) {
    const billing = page.locator('#section-billing')
    await billing.getByRole('button', { name: 'Add a billing profile' }).click()
    const editor = billing.getByRole('group', { name: 'Add a billing profile' })
    await editor.getByLabel('Company name').fill(name)
    await editor.getByLabel('Kennitala').fill(kennitala)
    await editor.getByLabel('Invoice email').fill(email)
    await editor.getByLabel('Address').fill('Laugavegur 1, 101 Reykjavík')
    return editor
  }

  test('adds a profile (kennitala checked), selects between profiles, and keeps the choice', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    const billing = page.locator('#section-billing')
    await expect(billing).toContainText('You have no billing profiles yet.')
    await expect(billing).toContainText('The invoice is sent after submissions close')
    await expect(outline(page, 'Billing')).not.toContainText('(complete)')

    const editor = await addProfile(page, 'Acme ehf.', '4110021299')
    await editor.getByLabel('Kennitala').blur()
    await expect(editor).toContainText('This kennitala is not valid.')
    await editor.getByRole('button', { name: 'Save profile' }).click()
    await expect(editor).toBeVisible() // refused: nothing saved
    await editor.getByLabel('Kennitala').fill(kt)
    await editor.getByLabel('Kennitala').blur()
    await expect(editor.getByLabel('Kennitala')).not.toHaveAttribute('aria-invalid', 'true')
    await expect(editor).not.toContainText('This kennitala is not valid.')
    await editor.getByRole('button', { name: 'Save profile' }).click()

    // A profile you just added is chosen.
    const acme = billing.locator('[data-profile]').filter({ hasText: 'Acme ehf.' })
    await expect(acme).toContainText('kt. 471003-1239')
    await expect(acme.getByRole('radio')).toBeChecked()
    await saved(page)
    await expect(outline(page, 'Billing')).toContainText('(complete)')

    await addProfile(page, 'Agency client hf.', '1203921239')
    await billing.getByRole('button', { name: 'Save profile' }).click()
    const client = billing.locator('[data-profile]').filter({ hasText: 'Agency client hf.' })
    await expect(client.getByRole('radio')).toBeChecked()
    await expect(acme.getByRole('radio')).not.toBeChecked()
    await acme.getByRole('radio').check()
    await saved(page)

    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(
      page
        .locator('#section-billing [data-profile]')
        .filter({ hasText: 'Acme ehf.' })
        .getByRole('radio'),
    ).toBeChecked()
    await context.close()
  })

  test('edits and deletes a profile, but not one that is chosen on a project', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    const billing = page.locator('#section-billing')
    await addProfile(page, 'Acme ehf.', kt)
    await billing.getByRole('button', { name: 'Save profile' }).click()
    await addProfile(page, 'Spare ehf.', '1203921239')
    await billing.getByRole('button', { name: 'Save profile' }).click()
    const acme = billing.locator('[data-profile]').filter({ hasText: 'Acme ehf.' })
    const spare = billing.locator('[data-profile]').filter({ hasText: 'Spare ehf.' })
    await acme.getByRole('radio').check()
    await saved(page)
    // Wait until the choice is on the server: it is what makes the profile "in use".
    await expect(async () => {
      await page.reload()
      await expect(page.locator('[data-lock="held"]')).toBeVisible()
      await expect(
        page
          .locator('#section-billing [data-profile]')
          .filter({ hasText: 'Acme ehf.' })
          .getByRole('radio'),
      ).toBeChecked({ timeout: 1500 })
    }).toPass({ timeout: 15_000 })

    await acme.getByRole('button', { name: 'Edit: Acme ehf.' }).click()
    const editor = billing.getByRole('group', { name: 'Edit' })
    await editor.getByLabel('Address').fill('Somewhere else 9')
    await editor.getByRole('button', { name: 'Save profile' }).click()
    await expect(acme).toContainText('Somewhere else 9')

    // The one in use stays; the spare goes.
    await acme.getByRole('button', { name: 'Delete: Acme ehf.' }).click()
    await acme.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(billing.getByRole('alert')).toContainText('chosen on a project')
    await expect(acme).toBeVisible()
    await spare.getByRole('button', { name: 'Delete: Spare ehf.' }).click()
    await spare.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(spare).toHaveCount(0)
    await context.close()
  })

  test('profiles belong to the person: someone else does not see them', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    await startProject(anna.page)
    await addProfile(anna.page, 'Annas ehf.', kt)
    await anna.page
      .locator('#section-billing')
      .getByRole('button', { name: 'Save profile' })
      .click()
    await expect(anna.page.locator('#section-billing [data-profile]')).toHaveCount(1)

    const bjarni = await person(browser, 'Bjarni')
    await startProject(bjarni.page)
    await expect(bjarni.page.locator('#section-billing [data-profile]')).toHaveCount(0)
    await expect(bjarni.page.locator('#section-billing')).toContainText(
      'You have no billing profiles yet.',
    )
    await anna.context.close()
    await bjarni.context.close()
  })
})

test.describe('review', () => {
  test('lists what is missing with links that land on the field, and the price breakdown', async ({
    browser,
  }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    const review = page.locator('#section-review')
    await expect(review.locator('[data-missing] li')).toHaveCount(2) // a category, and billing
    await expect(review.locator('[data-missing]')).toContainText('Choose at least one category.')

    await page.getByRole('checkbox', { name: 'Marketing Website' }).check()
    await saved(page)
    const missing = review.locator('[data-missing]')
    await expect(missing).toContainText('Project title: This field is required.')
    await expect(missing).toContainText('Project owner')
    await expect(missing).toContainText('Choose who is invoiced.')

    // Prices: early bird against regular, with the deadline.
    await expect(review.locator('[data-price="marketing-website"]')).toContainText('18,900 kr.')
    await expect(review.locator('[data-price="marketing-website"]')).toContainText('26,900 kr.')
    await expect(review).toContainText(
      'Submit by the end of 4 January 2027 to get the early-bird price, 18,900 kr. instead of 26,900 kr.',
    )
    await expect(review.locator('[data-review-total-early]')).toHaveText('18,900 kr.')

    // A link takes you to its field, and fixing the field removes the item.
    await missing.getByRole('link', { name: /^Project title/ }).click()
    await expect(page.locator('[data-field="title"] input')).toBeFocused()
    await page.locator('[data-field="title"] input').fill('Brand new site')
    await expect(missing.getByRole('link', { name: /^Project title/ })).toHaveCount(0)

    await missing.getByRole('link', { name: /^Public credit/ }).click()
    await expect(page.locator('[data-field="publicCredit"] input')).toBeFocused()
    await missing.getByRole('link', { name: 'Choose who is invoiced.' }).click()
    await expect(page.locator('#section-billing').locator('button, input').first()).toBeFocused()

    // The summary shows answers, never the login details.
    await expect(review.locator('[data-answer="title"]')).toContainText('Brand new site')
    await expect(review.locator('[data-answer="description"]')).toContainText('Not answered')
    // The submit step is a marked slot, not built here.
    await expect(review.locator('[data-slot="submit"]')).toBeVisible()
    await context.close()
  })

  test('is complete only when nothing is missing, and says so', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'App', exact: true }).check()
    await saved(page)
    await page.locator('[data-field="title"] input').fill('The app')
    await page.locator('[data-field="description"] textarea').fill('A fine app.')
    await page.locator('[data-field="appLinks"] input').first().fill('https://example.is/app')
    const owner = page.locator('[data-field="owners"]').getByRole('group', { name: 'Owner 1' })
    await owner.getByLabel('Name').fill('Anna')
    await owner.getByLabel('Email').fill('anna@example.is')
    await page.locator('[data-field="publicCredit"] input').fill('Anna Ltd.')
    await saved(page)
    await expect(outline(page, 'Review and submit')).not.toContainText('(complete)') // billing still missing
    const billing = page.locator('#section-billing')
    await billing.getByRole('button', { name: 'Add a billing profile' }).click()
    const editor = billing.getByRole('group', { name: 'Add a billing profile' })
    await editor.getByLabel('Company name').fill('Acme ehf.')
    await editor.getByLabel('Kennitala').fill('4710031239')
    await editor.getByLabel('Invoice email').fill('invoices@example.is')
    await editor.getByLabel('Address').fill('Laugavegur 1')
    await editor.getByRole('button', { name: 'Save profile' }).click()
    await saved(page)
    const review = page.locator('#section-review')
    await expect(review.locator('[data-missing-none]')).toHaveText('Nothing is missing.')
    await expect(review).toContainText(
      'An invoice will be sent to Acme ehf., kt. 471003-1239, after submissions close.',
    )
    for (const s of [
      'Categories',
      'The project',
      'Category questions',
      'People and credit',
      'Billing',
      'Review and submit',
    ])
      await expect(outline(page, s)).toContainText('(complete)')
    await context.close()
  })
})

test.describe('the whole form', () => {
  test('has no axe violations with everything open', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page)
    await page.getByRole('checkbox', { name: 'Logged-In Platform' }).check()
    await page.getByRole('checkbox', { name: 'Student Project' }).check()
    await page
      .locator('[data-choice="company-website"]')
      .getByRole('radio', { name: 'Small' })
      .check()
    await saved(page)
    await page.locator('[data-choice="marketing-website"]').getByText('Full description').click()
    await page
      .locator('[data-field="description"]')
      .getByRole('button', { name: 'More information' })
      .click()
    await page.locator('#section-people').getByRole('button', { name: 'Add an owner' }).click()
    await page
      .locator('#section-people')
      .getByRole('button', { name: 'Add a collaborator' })
      .click()
    await page.locator('#section-questions details summary').first().click()
    await page
      .locator('#section-billing')
      .getByRole('button', { name: 'Add a billing profile' })
      .click()
    await settle(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
      ),
    ).toEqual([])
    await context.close()
  })

  test('works in Icelandic', async ({ browser }) => {
    const { context, page } = await person(browser, 'Anna')
    await startProject(page, 'is')
    await expect(page.locator('main#main h2')).toHaveText([
      'Flokkar',
      'Verkefnið',
      'Spurningar flokkanna',
      'Fólk og þakkir',
      'Mynd',
      'Greiðsla',
      'Yfirlit og innsending',
    ])
    await expect(page.locator('[data-choice="company-website"]').getByRole('radio')).toHaveCount(4)
    await expect(page.locator('#section-image')).toContainText('Væntanlegt')
    await expect(page.locator('#section-billing')).toContainText(
      'Reikningur er sendur eftir að innsendingum lýkur',
    )
    await expect(page.locator('#section-review [data-missing]')).toContainText(
      'Veldu að minnsta kosti einn flokk.',
    )
    await context.close()
  })
})
