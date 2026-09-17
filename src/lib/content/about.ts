import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import {
  toAboutContent,
  toBoardMember,
  type AboutContent,
  type AboutPageAllLocales,
  type BoardMemberAllLocales,
  type BoardMemberView,
} from './about-mapping'

/**
 * Reading the About page's content for the public site.
 *
 * Two sources, because the design's About page is two things: an editable page
 * (`about-page` global — story, FAQ, press, brand assets) and a roster
 * (`board-members` collection). Shaping either into a view model is pure and
 * lives in `./about-mapping.ts`; pages import from here only.
 */

export type {
  AboutContent,
  BoardMemberView,
  BoardPortrait,
  BrandAssetView,
  FaqItemView,
  PressLinkView,
} from './about-mapping'

/**
 * The board, in the order the association puts it in.
 *
 * `sort: 'order'` rather than the collection's `defaultSort` by accident: the
 * grid is a chair-first list, not an alphabetical one, and the accent rotation
 * the design applies is positional — a reordering that came out of Postgres in
 * an arbitrary order would recolour the grid on every deploy.
 *
 * `pagination: false` because the board is eight people today and Payload's
 * `find` defaults to ten. A board that grows by three would otherwise lose its
 * last members off the page with no symptom at all.
 *
 * `depth: 1` resolves the `photo` upload; see `BoardCard` for what happens when
 * there isn't one.
 */
export const listBoardMembers = cache(async function listBoardMembers(
  locale: Locale,
): Promise<BoardMemberView[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'board-members',
    ...publicReadArgs,
    sort: 'order',
    pagination: false,
    depth: 1,
  })
  return (docs as unknown as BoardMemberAllLocales[]).map((doc) => toBoardMember(doc, locale))
})

/**
 * The `about-page` global: story, FAQ, press list and brand assets.
 *
 * Cached per request so the page body and a future `generateMetadata` can each
 * ask for it without a second round trip.
 */
export const getAboutContent = cache(async function getAboutContent(
  locale: Locale,
): Promise<AboutContent> {
  const payload = await getPayload()
  const doc = await payload.findGlobal({
    slug: 'about-page',
    ...publicReadArgs,
    depth: 1,
  })
  return toAboutContent(doc as unknown as AboutPageAllLocales, locale)
})
