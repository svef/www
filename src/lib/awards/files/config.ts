/** Where the private bucket is, from `AWARDS_R2_*` (see `.env.example`). No server-only guard: the bucket script reads it too. */

export type StoreConfig = {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export function readStoreConfig(env: Readonly<Record<string, string | undefined>> = process.env): StoreConfig | null {
  const endpoint = env.AWARDS_R2_ENDPOINT
  const bucket = env.AWARDS_R2_BUCKET
  const accessKeyId = env.AWARDS_R2_ACCESS_KEY_ID
  const secretAccessKey = env.AWARDS_R2_SECRET_ACCESS_KEY
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null
  return { endpoint, bucket, accessKeyId, secretAccessKey }
}

export function isStoreConfigured(): boolean {
  return readStoreConfig() !== null
}

