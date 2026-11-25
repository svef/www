import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  RequestContext,
} from 'payload'
import { REVALIDATE, type RevalidatedSlug, type RevalidationTarget } from './paths'

/**
 * Turning an editor's save into an immediate update.
 *
 * Public pages are static with `revalidate = 300`, so without this an editor
 * hits publish and waits up to five minutes — and because a cached response is
 * served *while* the regeneration happens, the first visitor after the window
 * still sees the old page. These hooks collapse that to "the next request is
 * fresh". Which pages a save reaches is decided in `./paths.ts`.
 *
 * **This does not replace the interval.** No hook fires when a date simply
 * arrives, and `publishedAt` is how a post is scheduled, so the interval is
 * still what brings a scheduled post to life. The two do different jobs.
 *
 * Failures are swallowed on purpose. `revalidatePath` throwing must not turn
 * into a failed save in the admin: the document is the thing that matters and
 * it is already written by the time these run. A stale page corrects itself
 * within the interval; a save that appears to fail makes an editor retype
 * their work.
 */

/**
 * Set this in a Local API call's `context` to skip revalidation — for a script
 * such as `seed:dev`, which runs outside Next and so has no page cache to flush.
 */
export const SKIP_REVALIDATE = 'skipRevalidate'

function flush(slug: RevalidatedSlug, context: RequestContext | undefined): void {
  if (context?.[SKIP_REVALIDATE]) return
  const targets: readonly RevalidationTarget[] = REVALIDATE[slug]
  for (const { path, type } of targets) {
    try {
      revalidatePath(path, type)
    } catch (cause) {
      // Logged rather than thrown — see above. Once: the targets share a
      // cause (most often, a write from outside a Next request), so one line
      // says as much as a dozen.
      console.error(
        `[revalidate] ${slug}: revalidating ${path} failed; the rest skipped.`,
        cause,
      )
      return
    }
  }
}

/** Marks the hooks this module makes, keyed to the slug they flush for. */
export const REVALIDATE_HOOK = Symbol('revalidate')

/**
 * The hook itself, the same for every collection and global: what it flushes
 * depends only on which one it is, never on the document. Marked so the
 * coverage test can find it among the hooks plugins add.
 */
function hookFor(slug: RevalidatedSlug) {
  const hook = <T>({ doc, context }: { doc: T; context?: RequestContext }): T => {
    flush(slug, context)
    return doc
  }
  return Object.assign(hook, { [REVALIDATE_HOOK]: slug })
}

/** `afterChange` and `afterDelete` for a collection that feeds public pages. */
export function revalidateCollection(slug: RevalidatedSlug): {
  afterChange: CollectionAfterChangeHook[]
  afterDelete: CollectionAfterDeleteHook[]
} {
  return { afterChange: [hookFor(slug)], afterDelete: [hookFor(slug)] }
}

/** `afterChange` for a global that feeds public pages. */
export function revalidateGlobal(slug: RevalidatedSlug): {
  afterChange: GlobalAfterChangeHook[]
} {
  return { afterChange: [hookFor(slug)] }
}
