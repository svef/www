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
