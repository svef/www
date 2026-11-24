import { and, desc, eq, isNull } from 'drizzle-orm'
import { entryFile } from '../db/schema'
import type { Queryable } from '../projects/db-types'
import type { ProjectImage } from './types'

/** Plain reads of the image's `entry_file` rows (kept apart from `images.ts` so the project service can use them). */

export const IMAGE_FIELD_KEY = 'image'

export const toImage = (f: typeof entryFile.$inferSelect): ProjectImage => ({
  id: f.id,
  fileName: f.fileName,
  contentType: f.contentType,
  sizeBytes: f.sizeBytes,
})

/** The project's live image (`available`, not deleted), newest first, or null. */
export async function currentImage(
  q: Queryable,
  projectId: string,
): Promise<typeof entryFile.$inferSelect | null> {
  const [row] = await q
    .select()
    .from(entryFile)
    .where(
      and(
        eq(entryFile.projectId, projectId),
        eq(entryFile.fieldKey, IMAGE_FIELD_KEY),
        eq(entryFile.status, 'available'),
        isNull(entryFile.deletedAt),
      ),
    )
    .orderBy(desc(entryFile.createdAt))
    .limit(1)
  return row ?? null
}

export async function loadProjectImage(q: Queryable, projectId: string): Promise<ProjectImage | null> {
  const row = await currentImage(q, projectId)
  return row ? toImage(row) : null
}

