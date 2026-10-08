import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import {
  toMembership,
  type Membership,
  type MembershipAllLocales,
} from './membership-mapping'

/**
 * Reading the `membership-page` global for the public site.
 *
 * Same split as `./news.ts`: this module owns the Payload read, and shaping the
 * document into a view model has no I/O in it and lives in
 * `./membership-mapping.ts`.
 */

export type { Membership, MembershipBenefit, MembershipTier } from './membership-mapping'

/**
 * The membership page's content, in the reader's locale where it exists.
 *
 * Cached per request. /skraning is the only caller today, so that is one query
 * either way; the cache is what lets a `generateMetadata` (or a fee quoted on
 * another page) read the same global without a second round trip.
 */
export const getMembership = cache(async function getMembership(
  locale: Locale,
): Promise<Membership> {
  const payload = await getPayload()
  const doc = await payload.findGlobal({
    slug: 'membership-page',
    ...publicReadArgs,
    depth: 0,
  })
  return toMembership(doc as unknown as MembershipAllLocales, locale)
})
