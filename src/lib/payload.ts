import { getPayload as getPayloadInstance } from 'payload'
import config from '@payload-config'
import { draftMode } from 'next/headers'

export const getPayload = () => getPayloadInstance({ config })

/** Whether Next.js draft mode is enabled (used for Payload live preview). */
export async function isDraftMode(): Promise<boolean> {
  try {
    const draft = await draftMode()
    return draft.isEnabled
  } catch {
    return false
  }
}

/**
 * Arguments every public-site read passes to the Local API.
 *
 * `locale: 'all'` returns each localized field as `{ is, en }` instead of a
 * single resolved string. That costs one query — the same query — and is what
 * lets a page tell "this is the English copy" from "this is Icelandic showing
 * because no English copy exists yet" (see `@/lib/localized`). Reading with a
 * single locale throws that distinction away, because Payload's configured
 * `fallback: true` silently substitutes Icelandic.
 *
 * `overrideAccess: false` makes the read run as an anonymous visitor, so the
 * public site can never render a document the collection's own access control
 * would hide. Every collection today is `read: () => true`; this keeps it true
 * that the site only ever shows public content, without each page remembering.
 */
export const publicReadArgs = {
  locale: 'all',
  overrideAccess: false,
} as const
