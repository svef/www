// The absolute origin the site is served from, used for `metadataBase` so
// canonical and hreflang URLs are real links rather than localhost.
//
// `NEXT_PUBLIC_SITE_URL` comes first when it is readable, but it cannot be the
// only source: Vercel's Sensitive environment variables are not exposed during
// the build, and a landing page that prerenders at build time will then bake the
// fallback into every canonical tag. `VERCEL_PROJECT_PRODUCTION_URL` is a system
// variable Vercel always provides at build, and it names the production domain
// even on preview deployments — which is the right canonical target anyway.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}

/** The site's own domains: production, its www alias, and the dev branch's preview domain. */
const KNOWN_ORIGINS = ['https://svef.is', 'https://www.svef.is', 'https://dev.svef.is']

/**
 * The origins Payload trusts (`csrf` in `payload.config.ts`): which `Origin` a cookie-signed
 * request to its API may come from, and which `Host` it will believe when it builds an
 * absolute link (a Payload password-reset email) without a `serverURL`.
 *
 * Off Vercel it is empty, as it always was: Payload then enforces nothing, so a local server
 * on any port (the e2e build runs on 3100) keeps working. On Vercel it is every host this
 * deployment answers on: the site's domains, the canonical one from `getSiteUrl()`, and the
 * deployment's own `*.vercel.app` URLs (`VERCEL_URL`, `VERCEL_BRANCH_URL`), so production,
 * dev.svef.is and a preview opened at its Vercel URL are all let in. These are system
 * variables, readable at build and at runtime alike.
 */
export function getTrustedOrigins(): string[] {
  if (!process.env.VERCEL) return []
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].flatMap((h) => (h ? [`https://${h}`] : []))
  return [...new Set([getSiteUrl(), ...KNOWN_ORIGINS, ...hosts])]
}
