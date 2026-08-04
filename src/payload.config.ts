import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { seoPlugin } from '@payloadcms/plugin-seo'
import sharp from 'sharp'

import { Users } from './payload/collections/Users'
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default buildConfig({
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
  }),
  sharp,
  plugins: [
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
