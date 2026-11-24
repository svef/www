import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { readStoreConfig } from './config'

/**
 * Creates the private uploads bucket if it is missing and applies the CORS rule the browser
 * upload needs. For local MinIO (`docker run … minio server /data`) and for R2 alike:
 *
 *   npm run awards:bucket
 *
 * Reads `AWARDS_R2_*` from `.env.local`. `AWARDS_BUCKET_ORIGINS` (comma separated) lists the
 * origins allowed to PUT; the default is the local dev and e2e ports. MinIO answers CORS calls
 * with "not implemented" and allows every origin itself, which is fine locally and is ignored here.
 */
const config = readStoreConfig()
if (!config) {
  console.error('AWARDS_R2_* is not set; nothing to do.')
  process.exit(1)
}
const client = new S3Client({
  region: 'auto',
  endpoint: config.endpoint,
  credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  forcePathStyle: true,
})
const origins = (process.env.AWARDS_BUCKET_ORIGINS ?? 'http://localhost:3000,http://localhost:3100')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

try {
  await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
  console.log(`Bucket ${config.bucket} exists.`)
} catch {
  await client.send(new CreateBucketCommand({ Bucket: config.bucket }))
  console.log(`Created bucket ${config.bucket} (private).`)
}
try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: config.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ['PUT', 'GET', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  )
  console.log(`CORS set for ${origins.join(', ')}.`)
} catch (e) {
  console.log(`CORS not applied (${(e as Error).name}); MinIO allows all origins by default.`)
}
