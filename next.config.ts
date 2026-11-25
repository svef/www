import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { PORTAL_ROUTES, ACCOUNT_ROUTES, publicPrefixes } from './src/lib/seo/private-pages'

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md/CLAUDE.md in the repo.
  agentRules: false,
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  // No `remotePatterns` here on purpose. `payload.config.ts`'s `s3Storage` plugin
  // sets no `generateFileURL`, so Payload hands back its own relative URLs
  // (`/api/media/file/<filename>`) rather than absolute R2 URLs — `next/image`
  // serves those from this app's own origin and never consults the allowlist.
  // The two configs used to disagree about this (one assumed public R2 URLs
  // were already in use, the other didn't serve them) — svef/www#77. If public
  // R2 URLs become the intent, add `generateFileURL` there and reinstate a
  // `remotePatterns` entry derived from a *required* `R2_PUBLIC_URL` (fail the
  // build if it's unset, not just at request time).
  images: {},

  /**
   * The seeded sponsor logos (`npm run seed:dev`).
   *
   * Payload derives a media document's URL from its filename (`/api/media/file/<filename>`)
   * and serves it from R2, which local development has no bucket for. The seed's placeholder
   * logos are therefore named `dev-fixture-<file>`, and this serves them from
   * `public/dev-fixtures/sponsors/<file>` instead. It matches nothing a real upload is called,
   * and `beforeFiles` puts it ahead of the Payload route.
   */
  async rewrites() {
    return {
      beforeFiles: [
        // The seed's placeholder album photos, ahead of the sponsor rule below.
        {
          source: '/api/media/file/dev-fixture-photo-:file',
          destination: '/dev-fixtures/photos/photo-:file',
        },
        {
          source: '/api/media/file/dev-fixture-:file',
          destination: '/dev-fixtures/sponsors/:file',
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },

  /**
   * Keep preview deployments out of search results.
   *
   * Every branch build serves the whole site on its own hostname — dev.svef.is
   * among them — with no canonical pointing at production, so an indexed
   * preview competes with the real site exactly as the old WordPress did
   * (svef/www#92).
   *
   * A header rather than a `robots.txt` disallow, for the reason set out in
   * `src/app/robots.ts`: blocking the crawl would stop a crawler ever fetching
   * the page, so it would never see the `noindex` — and anything already
   * indexed would stay indexed with no way to ask for its removal. This covers
   * every response, including files a `<meta>` tag cannot reach.
   *
   * `VERCEL_ENV` is 'production' only for the production deployment, 'preview'
   * for every branch build, and unset locally.
   */
  async headers() {
    /**
     * `/skjar/*` is the event screens: full-screen pages shown on a display at
     * an event, never linked from the site and of no use to a reader. They are
     * static files under `public/`, so they are public the moment the site is —
     * obscure, not secret, and the repository is public, so treat the URL as
     * known rather than hidden. The header keeps them out of search results on
     * every deployment, production included.
     */
    const screens = {
      source: '/skjar/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }

    /**
     * The signed-in portal and the account flows (`src/lib/seo/private-pages.ts`), at their
     * visible addresses in both languages. Their pages already say `noindex` in a `<meta>`;
     * the header also covers the responses that have no page to carry one, such as the
     * redirect a signed-out visitor gets from the portal to sign-in.
     */
    const privatePages = publicPrefixes([...PORTAL_ROUTES, ...ACCOUNT_ROUTES]).map((prefix) => ({
      source: `${prefix}/:path*`,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }))

    if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production') {
      return [screens, ...privatePages]
    }
    return [
      screens,
      ...privatePages,
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default withPayload(nextConfig)
