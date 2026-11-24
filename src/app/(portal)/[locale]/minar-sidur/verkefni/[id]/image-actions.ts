'use server'

import { getAwardsDb } from '@/lib/awards/db/client'
import {
  finalizeImageUpload,
  imagePreviewUrl,
  removeImage,
  requestImageUpload,
  type ImageOutcome,
  type UploadSlot,
} from '@/lib/awards/files/images'
import { getObjectStore } from '@/lib/awards/files/store'
import { AwardsError, type ActionResult } from '@/lib/awards/projects/errors'
import { getCurrentUserId, getRequestNow } from '@/lib/awards/session'

/**
 * Server actions for the presentation image. The file itself never passes through here: the
 * browser PUTs it straight to the private bucket with the URL `requestImageUploadAction` hands
 * out, then asks `finalizeImageUploadAction` to check it.
 */

async function run<T>(fn: (userId: string, now: Date) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const userId = await getCurrentUserId()
    return { ok: true, value: await fn(userId, await getRequestNow()) }
  } catch (e) {
    if (e instanceof AwardsError) return { ok: false, error: e.toPayload() }
    console.error('[awards] image action failed', e)
    return { ok: false, error: { code: 'unexpected', message: 'Something went wrong.' } }
  }
}

export async function requestImageUploadAction(
  projectId: string,
  file: { fileName: string; contentType: string; sizeBytes: number },
): Promise<ActionResult<UploadSlot>> {
  return run((userId, now) =>
    requestImageUpload(getAwardsDb(), getObjectStore(), { userId, projectId, now, ...file }),
  )
}

export async function finalizeImageUploadAction(
  projectId: string,
  fileId: string,
): Promise<ActionResult<ImageOutcome>> {
  return run((userId, now) =>
    finalizeImageUpload(getAwardsDb(), getObjectStore(), { userId, projectId, fileId, now }),
  )
}

export async function removeImageAction(projectId: string): Promise<ActionResult<null>> {
  return run(async (userId, now) => {
    await removeImage(getAwardsDb(), getObjectStore(), { userId, projectId, now })
    return null
  })
}

/** A signed URL, valid for a few minutes, for showing the current image; null when there is none. */
export async function imagePreviewAction(projectId: string): Promise<ActionResult<string | null>> {
  return run((userId) => imagePreviewUrl(getAwardsDb(), getObjectStore(), { userId, projectId }))
}
