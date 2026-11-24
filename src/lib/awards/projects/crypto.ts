import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM for login details (spec §3). Layout: version byte, 12-byte IV,
 * 16-byte tag, ciphertext. The key is `AWARDS_CREDENTIAL_KEY` (base64, 32 bytes).
 * Outside production a fixed development key is derived when it is unset, so
 * local work and tests need no setup; production refuses to run without one.
 */
const VERSION = 1

function key(): Buffer {
  const raw = process.env.AWARDS_CREDENTIAL_KEY
  if (raw) {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length !== 32)
      throw new Error('AWARDS_CREDENTIAL_KEY must be 32 bytes, base64-encoded.')
    return buf
  }
  if (process.env.NODE_ENV === 'production')
    throw new Error('AWARDS_CREDENTIAL_KEY is not set.')
  return createHash('sha256').update('svef-awards-development-key').digest()
}

export function encryptCredential(plain: string): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), body])
}

export function decryptCredential(blob: Buffer): string {
  if (blob[0] !== VERSION) throw new Error('Unknown credential encryption version.')
  const iv = blob.subarray(1, 13)
  const tag = blob.subarray(13, 29)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(blob.subarray(29)), decipher.final()]).toString('utf8')
}
