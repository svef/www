import { expect, test } from '@playwright/test'

/**
 * The Payload REST API is serving the seeded fixtures.
 *
 * When this suite was written, *nothing* rendered from Payload and these were the
 * only assertions that touched the database at all. #24 changed that: `/frettir`
 * and `/frettir/[slug]` now read real rows, so the news sweeps, the link
 * integrity check and `article.spec.ts` depend on the database too.
 *
 * These stay because they fail in a more useful way than a page sweep does. A
 * dead `DATABASE_URL` shows up here as a clear "the API returned no documents"
 * rather than as a page that renders an `EmptyState` and technically passes.
 *
 * The rest of the site still renders from hard-coded dictionaries and would pass
 * against a dead database — worth knowing before assuming the suite covers the
 * CMS end to end.
 *
 * Counts are asserted as "more than none" rather than exactly: the fixture counts
 * are a detail of `seed-dev.ts` and would make this a chore to update. What
 * matters is that the collection exists and has content in it.
 */
const SEEDED_COLLECTIONS = ['news', 'events', 'galleries', 'board-members'] as const

test.describe('payload API serves the seeded fixtures', () => {
  for (const collection of SEEDED_COLLECTIONS) {
    test(`/api/${collection} returns seeded documents`, async ({ request }) => {
      const response = await request.get(`/api/${collection}?limit=1`)
      expect(response.status(), `/api/${collection} status`).toBe(200)

      const body = await response.json()
      expect(
        body.totalDocs,
        `/api/${collection} returned no documents — is the database seeded ` +
          `(npm run seed:dev)?`,
      ).toBeGreaterThan(0)
      expect(Array.isArray(body.docs), `/api/${collection} docs`).toBe(true)
      expect(body.docs[0]).toHaveProperty('id')
    })
  }
})
