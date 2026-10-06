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
