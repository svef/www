import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { seoPlugin } from '@payloadcms/plugin-seo'
import sharp from 'sharp'

import { getTrustedOrigins } from '@/lib/site-url'

import { Users } from './payload/collections/Users'
import { Feedback, TalkProposals } from '@/payload/collections/Submissions'
import { Media } from './payload/collections/Media'
import { Events } from './payload/collections/Events'
import { News } from './payload/collections/News'
import { AwardEditions } from './payload/collections/AwardEditions'
import { AwardWinners } from './payload/collections/AwardWinners'
import { AwardCategories } from './payload/collections/AwardCategories'
import { BoardMembers } from './payload/collections/BoardMembers'
import { Galleries } from './payload/collections/Galleries'
import { SiteSettings } from './payload/globals/SiteSettings'
import { HomePage } from './payload/globals/pages/HomePage'
import { AboutPage } from './payload/globals/pages/AboutPage'
import { MembershipPage } from './payload/globals/pages/MembershipPage'
import { AwardsPage } from './payload/globals/pages/AwardsPage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// No `serverURL`, deliberately. Payload's admin builds its API and admin links from it, so a
// fixed value would send the admin on dev.svef.is or a preview to production's API
// (cross-origin, and a different branch's code); unset, those links stay relative and work on
// whichever host the admin is opened at. Where Payload needs an absolute origin (a password
// reset email), it takes the request's Host, but only if that host is in `csrf` below, which
// is why the list names every host a deployment answers on (`getTrustedOrigins`).
//
// The old `NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'` here was never used, and could
// not have worked: that variable is Sensitive on Vercel, so the build would have baked
// localhost.
export default buildConfig({
  csrf: getTrustedOrigins(),
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' | SVEF' },
    importMap: { baseDir: path.resolve(dirname) },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 390, height: 844 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
      collections: ['events', 'news'],
      globals: ['home-page', 'about-page', 'membership-page', 'awards-page'],
    },
  },
  // Bilingual, Icelandic-first. Fields marked `localized: true` carry per-locale
  // values; missing EN falls back to IS (see the IS-only content scope in site-plan.md).
  localization: {
    locales: [
      { label: 'Íslenska', code: 'is' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'is',
    fallback: true,
  },
  collections: [
    Users,
    // What readers send in. Append-only; see the file for why reads are closed.
    Feedback,
    TalkProposals,
    Media,
    Events,
    News,
    AwardEditions,
    AwardWinners,
    AwardCategories,
    BoardMembers,
    Galleries,
  ],
  globals: [SiteSettings, HomePage, AboutPage, MembershipPage, AwardsPage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
    },
    // Schema changes reach a hosted database through a migration, never through
    // a push from someone's laptop: `npm run migrate` runs before the build on
    // Vercel, so the deploy that needs a column is the deploy that adds it.
    //
    // Local development keeps pushing, which is why `npm run seed:dev` can drop
    // and recreate a schema in seconds. `VERCEL` is set on every Vercel build
    // and on no local one.
    //
    // It matters more here than it looks: `main` and `dev` point at the same
    // Neon database. A push from a branch whose collections have fallen behind
    // would not add tables, it would try to revert the other branch's — which
    // is why the submissions migration is hand-written and purely additive.
    push: !process.env.VERCEL,
  }),
  sharp,
  plugins: [
    // No `generateFileURL` here on purpose: Payload hands back its own relative
    // URLs (`/api/media/file/<filename>`) rather than absolute R2 URLs, and
    // `next.config.ts` is written to match — no `images.remotePatterns`, since
    // nothing requests an absolute R2 host today. See svef/www#77. If public R2
    // URLs become the intent, add `generateFileURL` here and update
    // `next.config.ts` together, driven by a *required* `R2_PUBLIC_URL`.
    s3Storage({
      collections: { media: true },
      bucket: process.env.R2_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        endpoint: process.env.R2_ACCOUNT_ID
          ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
          : undefined,
        region: 'auto',
      },
    }),
    seoPlugin({
      collections: ['events', 'news'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => `${(doc as Record<string, unknown>).title} | SVEF`,
    }),
  ],
})
