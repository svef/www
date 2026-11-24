import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { actAs, awardsPool, closeAwardsPool, createUser, emailOf } from './awards-session'
import { settle, urlFor } from './pages'

/**
 * Editor invitations (svef/www#165): ticking "Can edit" on a collaborator emails an
 * invitation; accepting it (after a real sign-up, or signed in) links the account and
 * grants editing; unticking takes it back; stale links say why they fail.
 *
 * The owner acts through the test-session cookie; the invitee either does the real
 * sign-up (the invitation is read from the local email outbox) or acts through the same
 * cookie as a user whose address is the invited one. Every test makes its own people.
 */
test.afterAll(closeAwardsPool)

const OUTBOX = path.resolve(process.cwd(), '.awards-outbox')
const baseURL = () => test.info().project.use.baseURL as string
const PASSWORD = 'correct horse battery'
const DAY = 24 * 60 * 60 * 1000

async function person(browser: Browser, name: string) {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = await createUser(name, true)
  await actAs(context, baseURL(), id)
  return { context, id, page: await context.newPage() }
}

async function startProject(page: Page) {
  await page.goto(urlFor('en', '/innsendingar/ny'))
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.waitForURL(/\/submissions\/[0-9a-f-]{36}$/)
  await expect(page.locator('[data-lock="held"]')).toBeVisible()
  return page.url()
}

/** The newest invitation mail to `to`, with the path of its link. */
async function invitationTo(to: string, count = 1) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[]))
      .filter((f) => f.endsWith(`-${to}.json`))
      .sort()
    const mails = await Promise.all(
      files.map(async (f) => JSON.parse(await readFile(path.join(OUTBOX, f), 'utf8')) as { subject: string; text: string }),
    )
    const invites = mails.filter((m) => /invited you to edit|bauð þér að breyta/.test(m.subject))
    if (invites.length >= count) {
      const mail = invites[count - 1]
      const link = mail.text.match(/https?:\/\/\S+\/(?:invite|bod)\/\S+/)![0]
      return { mail, path: new URL(link).pathname }
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`no invitation to ${to} in ${OUTBOX}`)
}

/** Owner side: a collaborator ticked "Can edit" with an email. */
async function invite(page: Page, who: { name: string; email: string }): Promise<Locator> {
  const collab = page.locator('[data-field="collaborators"]')
  await collab.getByRole('button', { name: 'Add a collaborator' }).click()
  const row = collab.getByRole('group', { name: /^Collaborator \d$/ }).last()
  await row.getByLabel('Name').fill(who.name)
  await row.getByLabel('Role').fill('Developer')
  await row.getByLabel('Email', { exact: true }).fill(who.email)
  await row.getByLabel('Can edit').check()
  // The invitation goes out when the email field is left and the form saves.
  await row.getByLabel('Email', { exact: true }).focus()
  await row.getByLabel('Email', { exact: true }).press('Tab')
  await expect(row.locator('[data-invite="invited"]')).toContainText('Invited on')
  return row
}

async function leaveProject(page: Page, projectId: string) {
  // Leaving the page gives up the edit lock; wait for it so the next person can take it.
  await page.goto(urlFor('en', '/innsendingar/minar'))
  await expect
    .poll(async () => {
      const { rows } = await awardsPool().query('select 1 from project_edit_lock where project_id = $1', [projectId])
      return rows.length
    })
    .toBe(0)
}
const projectIdOf = (url: string) => url.match(/[0-9a-f-]{36}$/)![0]

test.describe('invitations', () => {
  test('owner invites by email; the invitee signs up from the link, accepts, and edits', async ({ browser }) => {
    const owner = await person(browser, 'Anna Owner')
    const url = await startProject(owner.page)
    await owner.page.getByLabel('Title').fill('Invited Site')
    const email = `invitee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
    const row = await invite(owner.page, { name: 'Katrín', email })
    await expect(owner.page.locator('[data-field="collaborators"]')).toContainText('Only you, who created it, can withdraw it')

    const { mail, path: link } = await invitationTo(email)
    expect(mail.subject).toContain('Anna Owner')
    expect(mail.subject).toContain('Invited Site')
    expect(mail.text).toContain('You cannot withdraw a submission')
    await leaveProject(owner.page, projectIdOf(url))

    // The invitee has no account: the link offers sign-up with the address filled in.
    const context = await browser.newContext({ baseURL: baseURL() })
    const page = await context.newPage()
    await page.goto(link)
    await settle(page)
    await expect(page.getByText('has invited you to edit the submission “Invited Site”')).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.getByRole('link', { name: 'Create account' }).click()
    await expect(page.getByLabel('Email')).toHaveValue(email)
    await page.getByLabel('Name').fill('Katrín Invitee')
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Account created' })).toBeVisible()
    await page.getByRole('link', { name: 'Continue' }).click()

    // Back on the invitation, signed in with the invited address: accept.
    await expect(page.getByText(`You are signed in as ${email}`)).toBeVisible()
    await page.getByRole('button', { name: 'Accept the invitation' }).click()
    await page.waitForURL(/\/submissions\/[0-9a-f-]{36}$/)
    await expect(page.locator('[data-lock="held"]')).toBeVisible()

    // It is on their dashboard, and they can edit it (the lock applies) but not withdraw.
    await page.goto(urlFor('en', '/innsendingar/minar'))
    await expect(page.getByRole('main')).toContainText('Invited Site')
    await page.goto(url)
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await page.getByLabel('Title').fill('Invited Site, edited')
    await expect(page.getByRole('status').filter({ hasText: /^Saved/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Withdraw/ })).toHaveCount(0)
    await leaveProject(page, projectIdOf(url))

    // The owner sees the state change, and the link is spent.
    await owner.page.goto(url)
    await expect(owner.page.locator('[data-lock="held"]')).toBeVisible()
    await expect(owner.page.locator('[data-invite="accepted"]')).toContainText('Accepted on')
    await expect(owner.page.getByLabel('Title')).toHaveValue('Invited Site, edited')
    await page.goto(link)
    await expect(page.getByRole('heading', { name: 'This invitation has already been used' })).toBeVisible()

    await owner.context.close()
    await context.close()
  })

  test('unticking revokes: an accepted editor loses the project and the link says so', async ({ browser }) => {
    const owner = await person(browser, 'Anna Owner')
    const editor = await person(browser, 'Bjarni Editor')
    const url = await startProject(owner.page)
    const email = await emailOf(editor.id)
    const row = await invite(owner.page, { name: 'Bjarni', email })
    const { path: link } = await invitationTo(email)
    await leaveProject(owner.page, projectIdOf(url))

    await editor.page.goto(link)
    await editor.page.getByRole('button', { name: 'Accept the invitation' }).click()
    await editor.page.waitForURL(/\/submissions\/[0-9a-f-]{36}$/)
    await expect(editor.page.locator('[data-lock="held"]')).toBeVisible()
    await leaveProject(editor.page, projectIdOf(url))
    await editor.page.goto(urlFor('en', '/innsendingar/minar'))
    await expect(editor.page.locator(`main a[href*="${projectIdOf(url)}"]`).first()).toBeVisible()

    await owner.page.goto(url)
    await expect(owner.page.locator('[data-lock="held"]')).toBeVisible()
    await row.getByLabel('Can edit').uncheck()
    await expect(row.locator('[data-invite]')).toHaveCount(0)
    await expect(owner.page.getByRole('status').filter({ hasText: /^Saved/ })).toBeVisible()
    await expect
      .poll(async () => {
        const { rows } = await awardsPool().query(
          `select accepted_at, user_id from project_person where project_id = $1 and kind = 'collaborator' and deleted_at is null`,
          [projectIdOf(url)],
        )
        return [rows[0].accepted_at, rows[0].user_id]
      })
      .toEqual([null, null])
    await leaveProject(owner.page, projectIdOf(url))

    const gone = await editor.page.goto(url)
    expect(gone?.status()).toBe(404)
    await editor.page.goto(urlFor('en', '/innsendingar/minar'))
    await expect(editor.page.locator(`main a[href*="${projectIdOf(url)}"]`)).toHaveCount(0)
    await editor.page.goto(link)
    await expect(editor.page.getByRole('heading', { name: 'This invitation was withdrawn' })).toBeVisible()

    await owner.context.close()
    await editor.context.close()
  })

  test('an expired link says so, in both languages', async ({ browser }) => {
    const owner = await person(browser, 'Anna Owner')
    const guest = await person(browser, 'Guest')
    const url = await startProject(owner.page)
    const email = await emailOf(guest.id)
    await invite(owner.page, { name: 'Guest', email })
    const { path: link } = await invitationTo(email)
    await leaveProject(owner.page, projectIdOf(url))

    // Fourteen days and a minute later (the test clock cookie moves the server clock).
    await actAs(guest.context, baseURL(), guest.id, 14 * DAY + 60_000)
    await guest.page.goto(link)
    await settle(guest.page)
    await expect(guest.page.getByRole('heading', { name: 'This invitation has expired' })).toBeVisible()
    await expect(guest.page.getByRole('button', { name: 'Accept the invitation' })).toHaveCount(0)
    expect((await new AxeBuilder({ page: guest.page }).analyze()).violations).toEqual([])

    await guest.page.goto(link.replace('/en/submissions/invite/', '/is/innsendingar/bod/'))
    await expect(guest.page.getByRole('heading', { name: 'Boðið er runnið út' })).toBeVisible()

    await owner.context.close()
    await guest.context.close()
  })

  test('Resend invitation sends a new link and withdraws the old one', async ({ browser }) => {
    const owner = await person(browser, 'Anna Owner')
    const url = await startProject(owner.page)
    const email = `resend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
    const row = await invite(owner.page, { name: 'Katrín', email })
    const first = await invitationTo(email)
    // A resend within the minute is refused; age the invitation instead of waiting.
    await awardsPool().query(
      `update project_person set invited_at = now() - interval '1 hour' where project_id = $1 and kind = 'collaborator'`,
      [projectIdOf(url)],
    )
    await row.getByRole('button', { name: 'Resend the invitation to Katrín' }).click()
    await expect(owner.page.getByRole('status').filter({ hasText: 'A new invitation was sent to Katrín.' })).toBeVisible()
    const second = await invitationTo(email, 2)
    expect(second.path).not.toBe(first.path)
    await leaveProject(owner.page, projectIdOf(url))

    const anon = await browser.newContext({ baseURL: baseURL() })
    const page = await anon.newPage()
    await page.goto(first.path)
    await expect(page.getByRole('heading', { name: 'This invitation was withdrawn' })).toBeVisible()
    await page.goto(second.path)
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible()

    await owner.context.close()
    await anon.close()
  })

  test('an account with another address must confirm to accept', async ({ browser }) => {
    const owner = await person(browser, 'Anna Owner')
    const other = await person(browser, 'Forwarded')
    const url = await startProject(owner.page)
    const email = `invited-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
    await invite(owner.page, { name: 'Katrín', email })
    const { path: link } = await invitationTo(email)
    await leaveProject(owner.page, projectIdOf(url))

    await other.page.goto(link)
    await expect(other.page.getByRole('heading', { name: 'The invitation was sent to another address' })).toBeVisible()
    expect((await new AxeBuilder({ page: other.page }).analyze()).violations).toEqual([])
    await other.page.getByRole('button', { name: 'Accept with this account' }).click()
    await other.page.waitForURL(/\/submissions\/[0-9a-f-]{36}$/)

    await owner.context.close()
    await other.context.close()
  })

  test('a link that matches nothing says so', async ({ page }) => {
    await page.goto('/en/submissions/invite/not-a-real-token')
    await settle(page)
    await expect(page.getByRole('heading', { name: 'We could not find this invitation' })).toBeVisible()
    await page.goto('/is/innsendingar/bod/not-a-real-token')
    await expect(page.getByRole('heading', { name: 'Þetta boð fannst ekki' })).toBeVisible()
  })
})
