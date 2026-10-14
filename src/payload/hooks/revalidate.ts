import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'
import type { LocalizedSlug } from './paths'

/**
 * Turning an editor's save into an immediate update.
 *
 * Public pages are static with `revalidate = 300` (svef/www#58), so without
 * this an editor hits publish and waits up to five minutes — and because a
 * cached response is served *while* the regeneration happens, the first
 * visitor after the window still sees the old page. These hooks collapse that
 * to "the next request is fresh".
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

function flush(paths: string[], label: string): void {
  for (const path of new Set(paths)) {
    try {
      revalidatePath(path)
    } catch (cause) {
      // Logged rather than thrown — see above.
      console.error(`[revalidate] ${label}: ${path} failed:`, cause)
    }
  }
}

/**
 * Reads the slug off a document that was fetched with every locale present.
 *
 * Payload returns a localized field as `{ is, en }` under `locale: 'all'` and
 * as a bare string otherwise. Hooks see the shape the request used, so this
 * accepts both rather than assuming — getting it wrong yields
 * `/is/frettir/[object Object]`, which revalidates nothing and says nothing.
 */
function slugOf(doc: unknown): LocalizedSlug | undefined {
  if (typeof doc !== 'object' || doc === null) return undefined
  const slug = (doc as { slug?: unknown }).slug
  if (typeof slug === 'string') return { is: slug, en: slug }
  if (typeof slug === 'object' && slug !== null) return slug as LocalizedSlug
  return undefined
}

/**
 * A collection hook for content whose documents have their own detail page.
 *
 * Revalidates the paths for the document as it is *now* and, on an update, as
 * it *was*: renaming a slug leaves the old URL cached and still serving, and
 * the old path is only knowable from `previousDoc`.
 */
export function revalidateCollection(
  label: string,
  pathsFor: (slug?: LocalizedSlug) => string[],
): CollectionAfterChangeHook {
  return ({ doc, previousDoc }) => {
    flush([...pathsFor(slugOf(doc)), ...pathsFor(slugOf(previousDoc))], label)
    return doc
  }
}

/** The same, for a deleted document — its detail page has to stop being served. */
export function revalidateCollectionDelete(
  label: string,
  pathsFor: (slug?: LocalizedSlug) => string[],
): CollectionAfterDeleteHook {
  return ({ doc }) => {
    flush(pathsFor(slugOf(doc)), label)
    return doc
  }
}

/** For collections that have no detail page of their own, and for globals. */
export function revalidateFixed(
  label: string,
  paths: () => string[],
): CollectionAfterChangeHook {
  return ({ doc }) => {
    flush(paths(), label)
    return doc
  }
}

export function revalidateFixedDelete(
  label: string,
  paths: () => string[],
): CollectionAfterDeleteHook {
  return ({ doc }) => {
    flush(paths(), label)
    return doc
  }
}

export function revalidateGlobal(
  label: string,
  paths: () => string[],
): GlobalAfterChangeHook {
  return ({ doc }) => {
    flush(paths(), label)
    return doc
  }
}
