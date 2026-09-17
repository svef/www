/**
 * DEVELOPMENT FIXTURES — `npm run seed:dev`
 * =========================================
 *
 * Fills the LOCAL database with development fixtures through Payload's Local
 * API, so pages that read from Payload can actually be looked at, screenshotted
 * and tested. It is **not** the route for real content — that is issue #29,
 * which will reuse this shape but not this copy.
 *
 * The copy comes from `seed-data.ts`, which transcribes the Claude Design export
 * that is the design of record. Read that file's header before changing values.
 *
 * Run it with:
 *
 *   npm run seed:dev
 *
 * It is idempotent: every document is matched on a stable, non-localized key
 * (slug / year / name / title, and site name + edition for award winners) and
 * updated in place, so re-running changes row contents but never row counts. Globals are single documents, so their arrays
 * (FAQ, membership tiers) are replaced wholesale rather than appended to.
 *
 * It refuses to run against anything that does not look like a local database,
 * because these fixtures must never reach a deployed environment.
 */

import { getPayload } from 'payload'
import type { CollectionSlug, Payload, Where } from 'payload'

import config from '../payload.config'
import {
  aboutStory,
  awardCategories,
  awardEditions,
  awardWinners,
  awardsIntro,
  awardsIntroEn,
  boardMembers,
  events,
  faq,
  galleries,
  homePage,
  homePageEn,
  membership,
  membershipEn,
  news,
  press,
  richText,
  siteSettings,
  siteSettingsEn,
} from './seed-data'

type Data = Record<string, unknown>

/**
 * Guards against pointing the fixtures at a real database. Local Postgres and
 * Neon's local proxy are the only hosts allowed.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || ''
  if (!url) {
    throw new Error('DATABASE_URL is not set — nothing to seed.')
  }
  const host = new URL(url).hostname
  const localHosts = ['localhost', '127.0.0.1', '::1', 'db', 'postgres', 'db.localtest.me']
  if (!localHosts.includes(host)) {
    throw new Error(
      `Refusing to seed development fixtures into "${host}". ` +
        'npm run seed:dev only runs against a local database.',
    )
  }
}

/**
 * Creates the document if `where` matches nothing, updates it if it does.
 * `is` is written in the Icelandic (default) locale; `en` is written as a second
 * pass so that only the fields that genuinely have English copy get an English
 * value — passing the whole document would copy Icelandic into the EN columns
 * and silently defeat the fallback.
 */
async function upsert(
  payload: Payload,
  collection: CollectionSlug,
  where: Where,
  is: Data,
  en?: Data,
): Promise<number | string> {
  const existing = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    locale: 'is',
    pagination: false,
    where,
  })

  const current = existing.docs[0]
  const saved = current
    ? await payload.update({
        collection,
        data: is as never,
        id: current.id,
        locale: 'is',
      })
    : await payload.create({ collection, data: is as never, locale: 'is' })

  if (en) {
    await payload.update({ collection, data: en as never, id: saved.id, locale: 'en' })
  }

  return saved.id
}

async function seed(payload: Payload): Promise<void> {
  // --- Events -------------------------------------------------------------
  const eventIds = new Map<string, number | string>()
  for (const event of events) {
    const id = await upsert(
      payload,
      'events',
      { slug: { equals: event.slug } },
      {
        description: event.description ? richText(event.description) : null,
        endDate: event.endDate ?? null,
        location: event.location ?? null,
        venueAddress: event.venueAddress ?? null,
        ticketPrice: event.ticketPrice ?? null,
        memberPrice: event.memberPrice ?? null,
        accessibility: event.accessibility ?? null,
        slug: event.slug,
        startDate: event.startDate,
        title: event.title,
      },
      event.titleEn ? { title: event.titleEn } : undefined,
    )
    eventIds.set(event.slug, id)
  }

  // --- News ---------------------------------------------------------------
  for (const item of news) {
    await upsert(
      payload,
      'news',
      { slug: { equals: item.slug } },
      {
        body: item.body ? richText(item.body) : null,
        excerpt: item.excerpt,
        publishedAt: item.publishedAt,
        slug: item.slug,
        title: item.title,
      },
    )
  }

  // --- Galleries ----------------------------------------------------------
  // Albums exist but stay empty: uploads need R2, which is not provisioned yet.
  for (const gallery of galleries) {
    await upsert(
      payload,
      'galleries',
      { title: { equals: gallery.title } },
      {
        date: gallery.date,
        event: eventIds.get(gallery.eventSlug) ?? null,
        images: [],
        title: gallery.title,
      },
    )
  }

  // --- Board members ------------------------------------------------------
  for (const member of boardMembers) {
    await upsert(
      payload,
      'board-members',
      { name: { equals: member.name } },
      {
        company: member.company ?? null,
        name: member.name,
        order: member.order,
        role: member.role,
      },
    )
  }

  // --- Award categories ---------------------------------------------------
  const categoryIds = new Map<string, number | string>()
  for (const category of awardCategories) {
    const id = await upsert(
      payload,
      'award-categories',
      { slug: { equals: category.slug } },
      { name: category.name, order: category.order, slug: category.slug },
      { name: category.nameEn },
    )
    categoryIds.set(category.slug, id)
  }

  // --- Award editions -----------------------------------------------------
  const editionIds = new Map<number, number | string>()
  for (const edition of awardEditions) {
    const id = await upsert(
      payload,
      'award-editions',
      { year: { equals: edition.year } },
      {
        ceremonyDate: edition.ceremonyDate ?? null,
        headline: edition.headline ?? null,
        submissionDeadline: edition.submissionDeadline ?? null,
        submissionUrl: edition.submissionUrl ?? null,
        ticketUrl: edition.ticketUrl ?? null,
        ticketsOnSaleFrom: edition.ticketsOnSaleFrom ?? null,
        venue: edition.venue ?? null,
        year: edition.year,
      },
      edition.headlineEn ? { headline: edition.headlineEn } : undefined,
    )
    editionIds.set(edition.year, id)
  }

  // --- Award winners ------------------------------------------------------
  // Keyed on site name *and* edition: the same site can win in more than one
  // year, and the historical archive import (#31) will bring those rows in.
  // Matching on siteName alone would silently overwrite the earlier year.
  for (const winner of awardWinners) {
    await upsert(
      payload,
      'award-winners',
      {
        and: [
          { siteName: { equals: winner.siteName } },
          { edition: { equals: editionIds.get(winner.year) } },
        ],
      },
      {
        blurb: winner.blurb ?? null,
        category: categoryIds.get(winner.categorySlug),
        edition: editionIds.get(winner.year),
        isSpecial: winner.isSpecial,
        siteName: winner.siteName,
      },
    )
  }

  // --- Globals ------------------------------------------------------------
  await payload.updateGlobal({
    data: siteSettings as never,
    locale: 'is',
    slug: 'site-settings',
  })

  // The footer blurb is chrome: it is on every page, so it is seeded in both
  // languages rather than left to fall back. No row ids to read back first —
  // unlike `membership-page` this global has no arrays.
  await payload.updateGlobal({
    data: siteSettingsEn as never,
    locale: 'en',
    slug: 'site-settings',
  })

  await payload.updateGlobal({ data: homePage as never, locale: 'is', slug: 'home-page' })
  await payload.updateGlobal({ data: homePageEn as never, locale: 'en', slug: 'home-page' })

  await payload.updateGlobal({
    data: { faq, press, story: richText(aboutStory) } as never,
    locale: 'is',
    slug: 'about-page',
  })

  await payload.updateGlobal({
    data: {
      intro: membership.intro,
      signupCtaLabel: membership.signupCtaLabel,
      tiers: membership.tiers.map((tier) => ({
        benefits: tier.benefits.map((benefit) => ({ benefit })),
        ctaLabel: tier.ctaLabel,
        featured: tier.featured ?? false,
        name: tier.name,
        priceISK: tier.priceISK,
      })),
    } as never,
    locale: 'is',
    slug: 'membership-page',
  })

  // English for the membership page only. Writing a second locale means reading
  // the row ids back first: Payload matches array rows by `id`, so posting the
  // English rows without them would replace the Icelandic array rather than
  // translate it, and the localized fields written a moment ago would be gone.
  const membershipIs = await payload.findGlobal({
    slug: 'membership-page',
    locale: 'is',
    depth: 0,
  })
  await payload.updateGlobal({
    data: {
      intro: membershipEn.intro,
      signupCtaLabel: membershipEn.signupCtaLabel,
      tiers: (membershipIs.tiers ?? []).map((tier, index) => ({
        id: tier.id,
        benefits: (tier.benefits ?? []).map((benefit, benefitIndex) => ({
          id: benefit.id,
          benefit: membershipEn.tiers[index]?.benefits[benefitIndex] ?? benefit.benefit,
        })),
        ctaLabel: membershipEn.tiers[index]?.ctaLabel ?? tier.ctaLabel,
        name: membershipEn.tiers[index]?.name ?? tier.name,
      })),
    } as never,
    locale: 'en',
    slug: 'membership-page',
  })

  await payload.updateGlobal({
    data: { intro: richText(awardsIntro) } as never,
    locale: 'is',
    slug: 'awards-page',
  })
  await payload.updateGlobal({
    data: { intro: richText(awardsIntroEn) } as never,
    locale: 'en',
    slug: 'awards-page',
  })
}

async function reportCounts(payload: Payload): Promise<void> {
  const collections: CollectionSlug[] = [
    'events',
    'news',
    'galleries',
    'board-members',
    'award-categories',
    'award-editions',
    'award-winners',
  ]

  for (const collection of collections) {
    const { totalDocs } = await payload.count({ collection })
    payload.logger.info(`  ${collection}: ${totalDocs}`)
  }
}

assertLocalDatabase()

const payload = await getPayload({ config })

payload.logger.info('Seeding DEVELOPMENT FIXTURES (not real content) …')
await seed(payload)
payload.logger.info('Seeded. Row counts:')
await reportCounts(payload)
payload.logger.info('Globals updated: site-settings, home-page, about-page, membership-page, awards-page')

await payload.destroy()
process.exit(0)
