import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

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
    if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production') return []
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default withPayload(nextConfig)
