import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { PORTAL_ROUTES, publicPrefixes } from '@/lib/seo/private-pages'

/**
 * `robots.txt`, chiefly so the sitemap is advertised.
 *
 * Crawling is allowed everywhere a reader can go. The exclusions are not content:
 *
 * - `/admin` is the CMS behind a login, and `/api` is Payload's REST surface (and the
 *   account and awards endpoints). Neither is a page.
 * - The signed-in portal, in both languages: Mínar síður (`/is/minar-sidur`,
 *   `/en/my-pages`) and the admin, Stjórnborð (`/is/stjornbord`, `/en/admin`). A crawler
 *   is never signed in, so all it would ever get there is a redirect to sign-in or a 404;
 *   there is nothing to index and nothing already indexed to remove. They also carry
 *   `noindex` (their layout) and an `X-Robots-Tag` (`next.config.ts`), in case a link is
 *   followed anyway.
 *
 * Deliberately *not* disallowing anything else — not the sign-in and sign-up pages, which
 * a crawler can fetch and which say `noindex` themselves, and not preview deployments,
 * which are a complete duplicate of the site on their own hostname and are kept out of
 * search by an `X-Robots-Tag: noindex` header (`next.config.ts`).
 *
 * That distinction is the whole trick, and it is easy to get backwards: a blocked page
 * cannot be fetched, so its `noindex` is never seen, and a URL already in the index stays
 * there with no way to ask for its removal. Allow the crawl, deny the indexing — and only
 * block what a crawler could never have read in the first place.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', ...publicPrefixes(PORTAL_ROUTES)],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
