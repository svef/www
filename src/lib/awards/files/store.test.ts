// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { readStoreConfig } from './config'
import { createObjectStore } from './store'

const config = {
  endpoint: 'http://localhost:9000',
  bucket: 'b',
  accessKeyId: 'AK',
  secretAccessKey: 'SK',
}

describe('object store', () => {
  it('reads its configuration from AWARDS_R2_*, and is absent when any is missing', () => {
    const env = {
      AWARDS_R2_ENDPOINT: 'http://x',
      AWARDS_R2_BUCKET: 'b',
      AWARDS_R2_ACCESS_KEY_ID: 'a',
      AWARDS_R2_SECRET_ACCESS_KEY: 's',
    }
    expect(readStoreConfig(env)).toEqual({
      endpoint: 'http://x',
      bucket: 'b',
      accessKeyId: 'a',
      secretAccessKey: 's',
    })
    expect(readStoreConfig({ ...env, AWARDS_R2_BUCKET: '' })).toBeNull()
    expect(readStoreConfig({})).toBeNull()
  })

  it('signs a PUT that binds the content type and length and expires soon', async () => {
    const { url, headers } = await createObjectStore(config).presignPut({
      key: 'awards/2026/p/u.png',
      contentType: 'image/png',
      sizeBytes: 1234,
      expiresInSeconds: 300,
    })
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('http://localhost:9000/b/awards/2026/p/u.png')
    expect(u.searchParams.get('X-Amz-Expires')).toBe('300')
    const signed = u.searchParams.get('X-Amz-SignedHeaders')!.split(';')
    expect(signed).toEqual(expect.arrayContaining(['content-type', 'content-length', 'host']))
    // No checksum the browser could not supply.
    expect(url).not.toMatch(/checksum/i)
    expect(headers).toEqual({ 'Content-Type': 'image/png' })
  })

  it('signs a GET that expires', async () => {
    const url = await createObjectStore(config).presignGet({ key: 'k.png', expiresInSeconds: 60 })
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('60')
  })
})
