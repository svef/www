import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md/CLAUDE.md in the repo.
  agentRules: false,
  experimental: {
    // Off because this site's URLs do not describe its routes.
    //
    // Optimistic routing lets the App Router client guess a route's shape from
    // its URL: once it has fetched one route tree it learns the pattern and
    // predicts the tree for any URL that looks the same, skipping the `/_tree`
    // request. `src/proxy.ts` makes that guess wrong. Icelandic is served
    // unprefixed and rewritten, so `/um-svef` is really `/[locale]/um-svef`
    // with `locale=is` — but it looks exactly like `/[locale]` with
    // `locale=um-svef`, which is the pattern the client just learned from
    // `/en`. It then prefetched the *home page* segment at `/um-svef`, a route
    // that does not exist, and every English page logged a 404 for the
    // prefetch of its own language toggle (svef/www#60).
    //
    // The Icelandic pages escaped it by accident: their own URL doesn't match
    // the rewritten tree either, so Next spotted the rewrite and never learned
    // a pattern from them. Only the English ones matched, so only they guessed.
    //
    // The cost is one `/_tree` request per prefetched link — which is what
    // already happened on every Icelandic page, and on seven of the eight links
    // on an English one. Prediction saved exactly the one request it got wrong.
    // Measured cross-locale navigation is not slower.
    //
    // This is an experimental flag, but losing it would not be quiet. This
    // object is typed as `NextConfig` and `next build` type-checks it, so a
    // Next upgrade that renames or removes the key fails the build with a
    // TS2561 rather than silently reverting the behaviour. Only a change in
    // what the flag *means* could slip through, and the console-error
    // assertion in `e2e/smoke.spec.ts` catches that: it fails on the 404 as
    // soon as it returns.
    optimisticRouting: false,
  },
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
}

export default withPayload(nextConfig)
