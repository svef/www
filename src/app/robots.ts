import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

/**
 * `robots.txt`, chiefly so the sitemap is advertised.
 *
 * Crawling is allowed everywhere a reader can go. The two exclusions are not
 * content: `/admin` is the CMS behind a login, and `/api` is Payload's REST
 * surface — neither is a page, and both would only waste crawl budget and put
 * the admin's login screen in results.
 *
 * Deliberately *not* disallowing anything else. The instinct to hide a page
 * from search by blocking it here is the wrong tool: a blocked page cannot be
 * fetched, so its `noindex` is never seen, and a URL already in the index stays
 * there with no way to remove it. Allow the crawl, deny the indexing.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
