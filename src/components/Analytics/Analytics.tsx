import Script from 'next/script'

// Self-hosted Umami (stats.valdez.is, on paprika). It sets no cookies and no
// cross-site identifiers, so it needs no consent banner — worth keeping that way
// on the site of an association that argues for professional standards.
//
// The tag renders only when a website id is configured, so local runs and
// preview deployments don't report into the production figures.
//
// `NEXT_PUBLIC_*` is inlined at build time, which means NEXT_PUBLIC_UMAMI_WEBSITE_ID
// must be a *plain* Vercel environment variable. A Sensitive one is unreadable
// during the build, and the tag would silently never render — the same trap that
// put localhost into the canonical URLs.
export function Analytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  if (!websiteId) return null

  return (
    <Script
      src="https://stats.valdez.is/stats.js"
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  )
}
