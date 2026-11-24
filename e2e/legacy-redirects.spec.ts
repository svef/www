import { expect, test } from '@playwright/test'

/**
 * The awards' signed-in pages moved from `/innsendingar` to the portal and the admin. Old
 * addresses (in emails already sent, and bookmarks) answer with a permanent redirect to the
 * new one, in the same language, the query string kept. The public page stays put.
 */
const ID = '0198c7a0-1111-7222-8333-444455556666'
const CASES: [string, string][] = [
  ['/is/innsendingar/minar', '/is/minar-sidur'],
  ['/en/submissions/mine', '/en/my-pages'],
  ['/is/innsendingar/ny', '/is/minar-sidur/verkefni/nytt'],
  ['/en/submissions/new', '/en/my-pages/projects/new'],
  [`/is/innsendingar/${ID}`, `/is/minar-sidur/verkefni/${ID}`],
  [`/en/submissions/${ID}`, `/en/my-pages/projects/${ID}`],
  ['/is/innsendingar/bod/tok_abc', '/is/minar-sidur/bod/tok_abc'],
  ['/en/submissions/invite/tok_abc', '/en/my-pages/invite/tok_abc'],
  ['/is/innsendingar/starfsfolk', '/is/stjornbord/verkefni'],
  ['/en/submissions/staff', '/en/admin/projects'],
  [`/is/innsendingar/starfsfolk/${ID}`, `/is/stjornbord/verkefni/${ID}`],
  [`/en/submissions/staff/${ID}`, `/en/admin/projects/${ID}`],
]

for (const [from, to] of CASES) {
  test(`${from} redirects permanently to ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(new URL(res.headers().location, 'http://localhost').pathname).toBe(to)
  })
}

test('the query string and hash survive, and an emailed link lands on the page after sign-in', async ({ request, page }) => {
  const res = await request.get('/is/innsendingar/starfsfolk?status=all&page=2', { maxRedirects: 0 })
  const url = new URL(res.headers().location, 'http://localhost')
  expect(url.pathname + url.search).toBe('/is/stjornbord/verkefni?status=all&page=2')

  // Signed out, an old project link goes through the redirect to sign-in, which returns to the new address.
  await page.goto(`/en/submissions/${ID}#requests`)
  await expect(page).toHaveURL(new RegExp(`/en/sign-in\\?next=${encodeURIComponent(`/en/my-pages/projects/${ID}`)}`))
})

test('the public submissions page is not redirected', async ({ request }) => {
  expect((await request.get('/is/innsendingar', { maxRedirects: 0 })).status()).toBe(200)
  expect((await request.get('/en/submissions', { maxRedirects: 0 })).status()).toBe(200)
})
