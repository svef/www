import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import sharp from 'sharp'
import { actAs, awardsPool, closeAwardsPool, createUser } from './awards-session'
import { urlFor } from './pages'

/**
 * The presentation image (svef/www#162): a valid 1080 × 1080 upload goes to the private bucket
 * and shows up through a signed URL; a wrong size gets the exact message before anything is
 * uploaded; replacing and removing work; and the section is read-only once intake has closed.
 *
 * Needs the S3 bucket the app is configured with (MinIO locally, a service in CI: README,
 * "Awards uploads"); skipped when `AWARDS_R2_ENDPOINT` is unset.
 */
const localEnv = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}
const configured = Boolean(process.env.AWARDS_R2_ENDPOINT ?? localEnv.AWARDS_R2_ENDPOINT)

test.skip(!configured, 'AWARDS_R2_ENDPOINT is not set')
test.afterAll(closeAwardsPool)

const baseURL = () => test.info().project.use.baseURL as string

const image = (width: number, height: number, format: 'png' | 'jpeg' = 'png') =>
  sharp({ create: { width, height, channels: 3, background: { r: 137, g: 23, b: 225 } } })
    [format]()
    .toBuffer()

async function person(browser: Browser, clock?: number, userId?: string) {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = userId ?? (await createUser('Anna'))
  await actAs(context, baseURL(), id, clock)
  return { context, id, page: await context.newPage() }
}

async function startProject(page: Page) {
  await page.goto(urlFor('en', '/innsendingar/ny'))
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.waitForURL(/\/submissions\/[0-9a-f-]{36}$|\/innsendingar\/[0-9a-f-]{36}$/)
  await expect(page.locator('[data-lock="held"]')).toBeVisible()
  return page.url().split('/').pop()!
}

const section = (page: Page) => page.locator('#section-image')
const files = async (projectId: string) =>
  (
    await awardsPool().query(
      `select id, status, content_type, size_bytes, deleted_at from entry_file where project_id = $1 order by created_at`,
      [projectId],
    )
  ).rows

async function upload(page: Page, name: string, mimeType: string, buffer: Buffer) {
  await section(page).getByTestId('image-input').setInputFiles({ name, mimeType, buffer })
}

test('the cleanup cron is guarded and sweeps nothing recent', async ({ request }) => {
  const url = '/api/awards/cron/file-cleanup'
  expect((await request.get(url)).status()).toBe(401)
  const ok = await request.get(url, { headers: { authorization: 'Bearer e2e-cron-secret' } })
  expect(ok.status()).toBe(200)
  expect(await ok.json()).toEqual({ swept: expect.any(Number) })
})

test.describe('the image section', () => {
  test('a 1080 × 1080 PNG is uploaded, checked, shown from the private bucket and ticks the section', async ({
    browser,
  }) => {
    const { context, page } = await person(browser)
    const id = await startProject(page)
    const outline = page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: /Image/ })
    await expect(outline).not.toContainText('(complete)')

    await expect(section(page)).toContainText('Square, 1080 × 1080 px, PNG or JPG, up to 10 MB.')
    await upload(page, 'logo.png', 'image/png', await image(1080, 1080))
    await expect(section(page).getByTestId('image-status')).toHaveText('The image was added.')

    const preview = section(page).getByRole('img', { name: 'The presentation image for this project' })
    await expect(preview).toBeVisible()
    await expect.poll(() => preview.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1080)
    // Served from the bucket by a signed URL, never a public one.
    expect(await preview.getAttribute('src')).toContain('X-Amz-Signature=')
    await expect(section(page)).toContainText('logo.png')
    await expect(outline).toContainText('(complete)')

    const rows = await files(id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'available', content_type: 'image/png', deleted_at: null })

    // Survives a reload.
    await page.reload()
    await expect(section(page).getByRole('img')).toBeVisible()
    await context.close()
  })

  test('a 1200 × 800 image gets the exact message and nothing is uploaded', async ({ browser }) => {
    const { context, page } = await person(browser)
    const id = await startProject(page)
    await upload(page, 'wide.png', 'image/png', await image(1200, 800))
    await expect(section(page).getByTestId('image-error')).toHaveText(
      'This image is 1200 × 800, it needs to be 1080 × 1080.',
    )
    await expect(section(page).getByRole('img')).toHaveCount(0)
    expect(await files(id)).toHaveLength(0)
    await context.close()
  })

  test('says so in Icelandic', async ({ browser }) => {
    const { context, page } = await person(browser)
    await startProject(page)
    await page.goto(page.url().replace('/en/submissions/', '/is/innsendingar/'))
    await upload(page, 'wide.png', 'image/png', await image(1200, 800))
    await expect(section(page).getByTestId('image-error')).toHaveText(
      'Myndin er 1200 × 800 en þarf að vera 1080 × 1080.',
    )
    await context.close()
  })

  test('refuses a file that is not a PNG or JPEG', async ({ browser }) => {
    const { context, page } = await person(browser)
    const id = await startProject(page)
    await upload(page, 'notes.png', 'image/png', Buffer.from('this is not an image'))
    await expect(section(page).getByTestId('image-error')).toHaveText('The image must be a PNG or JPG.')
    expect(await files(id)).toHaveLength(0)
    await context.close()
  })

  test('the server checks the real file too: right size claimed in the browser, wrong on arrival', async ({
    browser,
  }) => {
    const { context, page } = await person(browser)
    const id = await startProject(page)
    // The browser is shown a good 1080 × 1080 file, but the bytes PUT to the bucket are a
    // 1200 × 800 image of exactly the same length (both padded after the PNG's end), so the
    // signed type and length still match and only the server can tell.
    const [good0, bad0] = await Promise.all([image(1080, 1080), image(1200, 800)])
    const length = Math.max(good0.length, bad0.length)
    const pad = (b: Buffer) => Buffer.concat([b, Buffer.alloc(length - b.length)])
    const good = pad(good0)
    const bad = pad(bad0)
    await page.route(/X-Amz-Signature=/, async (route) => {
      if (route.request().method() !== 'PUT') return route.continue()
      await route.continue({ postData: bad })
    })
    await upload(page, 'sneaky.png', 'image/png', good)
    await expect(section(page).getByTestId('image-error')).toHaveText(
      'This image is 1200 × 800, it needs to be 1080 × 1080.',
      { timeout: 15_000 },
    )
    const rows = await files(id)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('rejected')
    await context.close()
  })

  test('replacing keeps one live image; removing clears it', async ({ browser }) => {
    const { context, page } = await person(browser)
    const id = await startProject(page)
    await upload(page, 'one.png', 'image/png', await image(1080, 1080))
    await expect(section(page).getByTestId('image-status')).toHaveText('The image was added.')
    await expect(section(page).getByRole('button', { name: 'Replace image' })).toBeVisible()

    await upload(page, 'two.jpg', 'image/jpeg', await image(1080, 1080, 'jpeg'))
    await expect(section(page)).toContainText('two.jpg')
    const rows = await files(id)
    expect(rows).toHaveLength(2)
    expect(rows[0].deleted_at).not.toBeNull()
    expect(rows[1]).toMatchObject({ status: 'available', content_type: 'image/jpeg', deleted_at: null })

    await section(page).getByRole('button', { name: 'Remove image' }).click()
    await expect(section(page).getByTestId('image-status')).toHaveText('The image was removed.')
    await expect(section(page).getByRole('img')).toHaveCount(0)
    expect((await files(id)).every((r) => r.deleted_at !== null)).toBe(true)
    await context.close()
  })

  test('is read-only once intake has closed, but still shows the image', async ({ browser }) => {
    const { context, page, id: userId } = await person(browser)
    const id = await startProject(page)
    await upload(page, 'logo.png', 'image/png', await image(1080, 1080))
    await expect(section(page).getByTestId('image-status')).toHaveText('The image was added.')
    await context.close()

    const closed = Date.parse('2027-02-02T00:00:00Z') - Date.now() + 60_000
    const late = await person(browser, closed, userId)
    await late.page.goto(urlFor('en', `/innsendingar/${id}`))
    await expect(late.page.locator('[data-lock="held"]')).toBeVisible()
    await expect(section(late.page).getByRole('img')).toBeVisible()
    await expect(section(late.page).getByRole('button', { name: 'Replace image' })).toBeDisabled()
    await expect(section(late.page).getByRole('button', { name: 'Remove image' })).toHaveCount(0)
    await late.context.close()
  })

  test('has no axe violations with an image in place', async ({ browser }) => {
    const { context, page } = await person(browser)
    await startProject(page)
    await upload(page, 'logo.png', 'image/png', await image(1080, 1080))
    await expect(section(page).getByRole('img')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([])
    await context.close()
  })
})
