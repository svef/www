// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { volumeTarget } from './seed-volume'

describe('volumeTarget', () => {
  const local = 'postgresql://svef:svef@localhost:5433/svef_awards'

  it('writes to a database of its own next to the local one', () => {
    expect(volumeTarget({ AWARDS_DATABASE_URL: local })).toEqual({
      ok: true,
      url: 'postgresql://svef:svef@localhost:5433/svef_awards_volume',
      admin: 'postgresql://svef:svef@localhost:5433/postgres',
      name: 'svef_awards_volume',
    })
    expect(volumeTarget({ AWARDS_DATABASE_URL_UNPOOLED: local.replace('localhost', '127.0.0.1'), AWARDS_VOLUME_DATABASE: 'vol2' })).toMatchObject({
      ok: true,
      name: 'vol2',
    })
  })

  it('refuses Vercel, remote hosts, a missing URL, odd names and the app’s own database', () => {
    expect(volumeTarget({ AWARDS_DATABASE_URL: local, VERCEL_ENV: 'preview' }).ok).toBe(false)
    expect(volumeTarget({ AWARDS_DATABASE_URL: local, VERCEL: '1' }).ok).toBe(false)
    expect(volumeTarget({ AWARDS_DATABASE_URL: 'postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db' }).ok).toBe(false)
    expect(volumeTarget({}).ok).toBe(false)
    expect(volumeTarget({ AWARDS_DATABASE_URL: local, AWARDS_VOLUME_DATABASE: 'x"; drop' }).ok).toBe(false)
    expect(volumeTarget({ AWARDS_DATABASE_URL: local, AWARDS_VOLUME_DATABASE: 'svef_awards' }).ok).toBe(false)
  })
})
