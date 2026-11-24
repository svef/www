/** What the upload code needs from the private bucket; `store.ts` is the S3 implementation, tests use a fake. */
export type ObjectStore = {
  /** A URL the browser PUTs the file to; type and length are bound into the signature. */
  presignPut(args: {
    key: string
    contentType: string
    sizeBytes: number
    expiresInSeconds: number
  }): Promise<{ url: string; headers: Record<string, string> }>
  /** A short-lived URL for viewing an object. */
  presignGet(args: { key: string; expiresInSeconds: number }): Promise<string>
  /** The object's size, or null when it does not exist. */
  head(key: string): Promise<{ sizeBytes: number } | null>
  /** The whole object, or null when it does not exist. */
  read(key: string): Promise<Buffer | null>
  /** Deletes an object; a missing one is not an error. */
  remove(key: string): Promise<void>
}

/** The current image of a project, as the form and the staff view show it. */
export type ProjectImage = {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
}
