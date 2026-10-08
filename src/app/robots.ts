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
 * Deliberately *not* disallowing anything else — including on preview
 * deployments, which are a complete duplicate of the site on their own
 * hostname. They are kept out of search by an `X-Robots-Tag: noindex` header
 * (`next.config.ts`) rather than by being blocked here.
 *
 * That distinction is the whole trick, and it is easy to get backwards: a
 * blocked page cannot be fetched, so its `noindex` is never seen, and a URL
 * already in the index stays there with no way to ask for its removal. Allow
 * the crawl, deny the indexing.
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
