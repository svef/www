import 'server-only'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { AwardsError } from '../projects/errors'
import { readStoreConfig, type StoreConfig } from './config'
import type { ObjectStore } from './types'

export { isStoreConfigured } from './config'

/**
 * The private bucket, spoken to through the S3 API. Cloudflare R2 in production, MinIO locally:
 * the endpoint, bucket and credentials come from `AWARDS_R2_*` (see `.env.example`). Nothing here
 * runs at import time, so a build without the variables still works; the first use without them
 * throws `storage_unavailable`.
 */

export function createObjectStore(config: StoreConfig): ObjectStore {
  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // Path style works on R2 and on MinIO at localhost; virtual-host style would need DNS for the latter.
    forcePathStyle: true,
    // Newer SDKs add a CRC32 checksum to every PUT. A browser upload through a presigned URL
    // cannot compute it, and R2 rejects the unexpected header; only checksum when required.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  const Bucket = config.bucket
  const missing = (e: unknown) => {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } }
    return err.name === 'NotFound' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404
  }

  return {
    async presignPut({ key, contentType, sizeBytes, expiresInSeconds }) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: sizeBytes,
        }),
        {
          expiresIn: expiresInSeconds,
          // Bind both: the bucket refuses a PUT whose type or length differs from what was asked for.
          signableHeaders: new Set(['content-type', 'content-length']),
        },
      )
      return { url, headers: { 'Content-Type': contentType } }
    },

    presignGet({ key, expiresInSeconds }) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), {
        expiresIn: expiresInSeconds,
      })
    },

    async head(key) {
      try {
        const r = await client.send(new HeadObjectCommand({ Bucket, Key: key }))
        return { sizeBytes: r.ContentLength ?? 0 }
      } catch (e) {
        if (missing(e)) return null
        throw e
      }
    },

    async read(key) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket, Key: key }))
        if (!r.Body) return null
        return Buffer.from(await r.Body.transformToByteArray())
      } catch (e) {
        if (missing(e)) return null
        throw e
      }
    },

    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }))
    },
  }
}

let shared: ObjectStore | undefined

/** The configured store, created on first use. */
export function getObjectStore(): ObjectStore {
  if (!shared) {
    const config = readStoreConfig()
    if (!config)
      throw new AwardsError(
        'storage_unavailable',
        'File storage is not configured (AWARDS_R2_ENDPOINT, AWARDS_R2_BUCKET, AWARDS_R2_ACCESS_KEY_ID, AWARDS_R2_SECRET_ACCESS_KEY).',
      )
    shared = createObjectStore(config)
  }
  return shared
}
