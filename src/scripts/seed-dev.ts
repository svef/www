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
import { SKIP_REVALIDATE } from '../payload/hooks/revalidate'
import {
  aboutStats,
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
  sponsorLogos,
} from './seed-data'

type Data = Record<string, unknown>

/**
 * Passed to every write. The content collections revalidate the site's cached
 * pages on save (svef/www#67), but this script runs outside Next, so there is no
 * page cache here to flush — without it every write would log a failure.
 */
const SEED_CONTEXT = { [SKIP_REVALIDATE]: true }

/**
 * Guards against pointing the fixtures at a real database by accident. Local
 * Postgres and Neon's local proxy are allowed without ceremony.
 *
 * A remote host is allowed only when `SEED_REMOTE_HOST` names it exactly. That
 * is deliberately more than a boolean: a flag set to `1` months ago and
 * forgotten still lets a stray `npm run seed:dev` overwrite whatever database
 * happens to be configured, whereas a hostname only matches the one database
 * someone meant. Written out in full each time, it cannot be a leftover.
 */
function assertSeedableDatabase(): void {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || ''
  if (!url) {
    throw new Error('DATABASE_URL is not set — nothing to seed.')
  }
  const host = new URL(url).hostname
  const localHosts = ['localhost', '127.0.0.1', '::1', 'db', 'postgres', 'db.localtest.me']
  if (localHosts.includes(host)) return

  if (process.env.SEED_REMOTE_HOST === host) {
    console.warn(`Seeding development fixtures into REMOTE host "${host}".`)
    return
  }

  throw new Error(
    `Refusing to seed development fixtures into "${host}". ` +
      'npm run seed:dev runs against a local database by default; to mean a ' +
      `remote one, name it: SEED_REMOTE_HOST=${host} npm run seed:dev`,
  )
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
        context: SEED_CONTEXT,
        collection,
        data: is as never,
        id: current.id,
        locale: 'is',
      })
    : await payload.create({
        context: SEED_CONTEXT,
        collection,
        data: is as never,
        locale: 'is',
      })

  if (en) {
    await payload.update({
      context: SEED_CONTEXT,
      collection,
      data: en as never,
      id: saved.id,
      locale: 'en',
    })
  }

  return saved.id
}

/**
 * A `media` document for a placeholder sponsor logo, created once and found again by filename.
 *
 * Not uploaded: a real upload goes through the R2 storage adapter, which local development
 * has no bucket for (the galleries stay empty for the same reason). The document is written
 * straight to the database, and `next.config.ts` serves its `dev-fixture-` filename from
 * `public/dev-fixtures`, so the page renders a real logo without storage. It is a dev fixture only — `assertSeedableDatabase`
 * has already refused anything that is not a local database.
 */
async function sponsorLogoId(
  payload: Payload,
  key: keyof typeof sponsorLogos,
): Promise<number | string> {
  const logo = sponsorLogos[key]
  const found = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    where: { filename: { equals: `dev-fixture-${logo.file}` } },
  })
  if (found.docs[0]) return found.docs[0].id

  const created = await payload.db.create({
    collection: 'media',
    data: {
      // `db.create` takes the stored shape, so a localized field is keyed by locale.
      alt: { is: logo.alt, en: logo.alt },
      // `next.config.ts` serves `dev-fixture-<file>` from `public/dev-fixtures/sponsors`.
      filename: `dev-fixture-${logo.file}`,
      mimeType: logo.mimeType,
      width: logo.width,
      height: logo.height,
      url: `/api/media/file/dev-fixture-${logo.file}`,
    },
  })
  return created.id
}

/** A placeholder album photo (`dev-fixture-photo-<n>.jpg`), created once and found again. */
async function galleryPhotoId(payload: Payload, n: number): Promise<number | string> {
  const filename = `dev-fixture-photo-${n}.jpg`
  const found = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    where: { filename: { equals: filename } },
  })
  if (found.docs[0]) return found.docs[0].id

  const created = await payload.db.create({
    collection: 'media',
    data: {
      alt: { is: '', en: '' },
      filename,
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
      url: `/api/media/file/${filename}`,
    },
  })
  return created.id
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
        ticketUrl: event.ticketUrl ?? null,
        title: event.title,
        sponsors: await Promise.all(
          (event.sponsors ?? []).map(async (sponsor) => ({
            name: sponsor.name,
            logo: await sponsorLogoId(payload, sponsor.logo),
            url: sponsor.url ?? null,
            label: sponsor.label ?? null,
          })),
        ),
      },
      // English overrides for the localized fields, not the title alone: an
      // event whose body stayed Icelandic on /en would look translated and
      // not be.
      //
      // `slug` is always sent. It is localized and required, so the English
      // record needs one; without an English slug it takes the Icelandic one,
      // which is what a reader gets for the body copy too.
      {
        slug: event.slugEn ?? event.slug,
        ...(event.titleEn ? { title: event.titleEn } : {}),
        ...(event.locationEn ? { location: event.locationEn } : {}),
        ...(event.descriptionEn ? { description: richText(event.descriptionEn) } : {}),
      },
    )
    eventIds.set(event.slug, id)

    // The English labels. The rows were just written, so they have ids now; the English pass
    // has to repeat them, or it would replace the rows and take the Icelandic labels with them.
    if (event.sponsors?.some((sponsor) => sponsor.labelEn)) {
      const saved = await payload.findByID({ collection: 'events', id, depth: 0, locale: 'is' })
      await payload.update({
        context: SEED_CONTEXT,
        collection: 'events',
        id,
        locale: 'en',
        data: {
          sponsors: (saved.sponsors ?? []).map((row, i) => ({
            id: row.id,
            name: row.name,
            logo: typeof row.logo === 'object' ? row.logo.id : row.logo,
            url: row.url ?? null,
            label: event.sponsors?.[i]?.labelEn ?? null,
          })),
        },
      })
    }
  }

  // --- Board members ------------------------------------------------------
  const memberIds = new Map<string, number | string>()
  for (const member of boardMembers) {
    const id = await upsert(
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
    memberIds.set(member.name, id)
  }

  // --- News ---------------------------------------------------------------
  for (const item of news) {
    await upsert(
      payload,
      'news',
      { slug: { equals: item.slug } },
      {
        author: item.author ?? null,
        authorMember: item.authorMemberName ? (memberIds.get(item.authorMemberName) ?? null) : null,
        body: item.body ? richText(item.body) : null,
        excerpt: item.excerpt,
        publishedAt: item.publishedAt,
        slug: item.slug,
        title: item.title,
      },
    )
  }

  // --- Galleries ----------------------------------------------------------
  // Real uploads need R2, which local development has no bucket for, so the photos are the
  // placeholder fixtures in `public/dev-fixtures/photos`, written straight to `media`.
  for (const gallery of galleries) {
    const images = []
    for (let n = 1; n <= gallery.photos; n++) images.push({ image: await galleryPhotoId(payload, n) })
    await upsert(
      payload,
      'galleries',
      { title: { equals: gallery.title } },
      {
        date: gallery.date,
        event: gallery.eventSlug ? (eventIds.get(gallery.eventSlug) ?? null) : null,
        images,
        title: gallery.title,
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
    context: SEED_CONTEXT,
    data: siteSettings as never,
    locale: 'is',
    slug: 'site-settings',
  })

  // The footer blurb is chrome: it is on every page, so it is seeded in both
  // languages rather than left to fall back. No row ids to read back first —
  // unlike `membership-page` this global has no arrays.
  await payload.updateGlobal({
    context: SEED_CONTEXT,
    data: siteSettingsEn as never,
    locale: 'en',
    slug: 'site-settings',
  })

  await payload.updateGlobal({
    context: SEED_CONTEXT,
    data: homePage as never,
    locale: 'is',
    slug: 'home-page',
  })
  await payload.updateGlobal({
    context: SEED_CONTEXT,
    data: homePageEn as never,
    locale: 'en',
    slug: 'home-page',
  })

  await payload.updateGlobal({
    context: SEED_CONTEXT,
    data: {
      faq,
      press,
      stats: aboutStats.map(({ value, label }) => ({ value, label })),
      story: richText(aboutStory),
    } as never,
    locale: 'is',
    slug: 'about-page',
  })

  // English labels for the stats: read the row ids back so Payload translates the rows
  // rather than replacing them (see the membership page below).
  const aboutIs = await payload.findGlobal({ slug: 'about-page', locale: 'is', depth: 0 })
  await payload.updateGlobal({
    context: SEED_CONTEXT,
    data: {
      stats: (aboutIs.stats ?? []).map((row, index) => ({
        id: row.id,
        value: row.value,
        label: aboutStats[index]?.labelEn ?? row.label,
      })),
    } as never,
    locale: 'en',
    slug: 'about-page',
  })

  await payload.updateGlobal({
    context: SEED_CONTEXT,
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
    context: SEED_CONTEXT,
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
    context: SEED_CONTEXT,
    data: { intro: richText(awardsIntro) } as never,
    locale: 'is',
    slug: 'awards-page',
  })
  await payload.updateGlobal({
    context: SEED_CONTEXT,
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

assertSeedableDatabase()

const payload = await getPayload({ config })

payload.logger.info('Seeding DEVELOPMENT FIXTURES (not real content) …')
await seed(payload)
payload.logger.info('Seeded. Row counts:')
await reportCounts(payload)
payload.logger.info('Globals updated: site-settings, home-page, about-page, membership-page, awards-page')

await payload.destroy()
process.exit(0)
