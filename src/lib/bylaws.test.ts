import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { degradedModeAllowed, getBylaws, LAWS_RAW_URL } from './bylaws'

const HEAD_URL = 'https://raw.githubusercontent.com/svef/Laws/HEAD/README.md'
const BYLAWS = '# Lög Samtaka Vefiðnaðarins'

// Retries are real awaits, so tests pass a zero backoff rather than waiting on them.
const fast = { backoffMs: 0 }

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the bylaws source URL', () => {
  it('points at the HEAD ref of svef/Laws, not a hardcoded branch', () => {
    expect(LAWS_RAW_URL).toBe(HEAD_URL)
  })

  // Regression guard for the defect this whole change exists to fix. An env override
  // let a stale dashboard value silently point the bylaws at a 404.
  it('is not configurable by environment variable', async () => {
    vi.stubEnv('GITHUB_LAWS_RAW_URL', 'https://example.invalid/somewhere-else.md')
    fetchMock.mockResolvedValue(new Response(BYLAWS))

    await getBylaws(fast)

    expect(fetchMock.mock.calls[0][0]).toBe(HEAD_URL)
  })
})

describe('getBylaws', () => {
  it('requests the default branch of svef/Laws via the HEAD ref', async () => {
    fetchMock.mockResolvedValue(new Response(BYLAWS))

    await getBylaws(fast)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(HEAD_URL)
  })

  it('returns the Markdown when the fetch succeeds', async () => {
    fetchMock.mockResolvedValue(new Response(BYLAWS))

    await expect(getBylaws(fast)).resolves.toEqual({ status: 'ok', markdown: BYLAWS })
  })

  it('throws on a 404 rather than degrading silently', async () => {
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))

    await expect(getBylaws(fast)).rejects.toThrow(/404/)
  })

  it('does not retry a 404 — a moved source is not a transient failure', async () => {
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))

    await expect(getBylaws({ ...fast, attempts: 3 })).rejects.toThrow(/404/)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('throws when the network call fails', async () => {
    fetchMock.mockRejectedValue(new Error('ENOTFOUND'))

    await expect(getBylaws(fast)).rejects.toThrow(/Failed to fetch SVEF bylaws/)
  })

  it('keeps the original failure as the error cause', async () => {
    const cause = new Error('ENOTFOUND')
    fetchMock.mockRejectedValue(cause)

    await expect(getBylaws(fast)).rejects.toMatchObject({ cause })
  })

  it('throws when the source is empty', async () => {
    fetchMock.mockResolvedValue(new Response('   \n'))

    await expect(getBylaws(fast)).rejects.toThrow(/is empty/)
  })

  it('contextualises a body read that fails mid-stream', async () => {
    const res = new Response(BYLAWS)
    vi.spyOn(res, 'text').mockRejectedValue(new Error('aborted'))
    fetchMock.mockResolvedValue(res)

    await expect(getBylaws(fast)).rejects.toThrow(/Failed to read SVEF bylaws body/)
  })
})

describe('retries', () => {
  it('retries a transient failure and succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(new Response(BYLAWS))

    await expect(getBylaws(fast)).resolves.toEqual({ status: 'ok', markdown: BYLAWS })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a 429 rate-limit, which is what a shared build IP actually hits', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response(BYLAWS))

    await expect(getBylaws(fast)).resolves.toEqual({ status: 'ok', markdown: BYLAWS })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a 5xx', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('boom', { status: 503 }))
      .mockResolvedValueOnce(new Response(BYLAWS))

    await expect(getBylaws(fast)).resolves.toEqual({ status: 'ok', markdown: BYLAWS })
  })

  it('gives up after the configured number of attempts', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'))

    await expect(getBylaws({ ...fast, attempts: 3 })).rejects.toThrow(/Failed to fetch/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('backs off between attempts by default', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'))

    const started = Date.now()
    await expect(getBylaws({ attempts: 2, backoffMs: 40 })).rejects.toThrow()
    expect(Date.now() - started).toBeGreaterThanOrEqual(30)
  })
})

describe('the BYLAWS_ALLOW_DEGRADED escape hatch', () => {
  it('is off by default, so a broken source still fails the build', async () => {
    expect(degradedModeAllowed({})).toBe(false)

    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))
    await expect(getBylaws({ ...fast, env: {} })).rejects.toThrow(/404/)
  })

  it('is off for any value other than an explicit opt-in', async () => {
    for (const value of ['', '0', 'false', 'no', 'yes', 'maybe']) {
      expect(degradedModeAllowed({ BYLAWS_ALLOW_DEGRADED: value })).toBe(false)
    }
    expect(degradedModeAllowed({ BYLAWS_ALLOW_DEGRADED: '1' })).toBe(true)
    expect(degradedModeAllowed({ BYLAWS_ALLOW_DEGRADED: 'true' })).toBe(true)
  })

  it('downgrades a hard failure to a warning when explicitly set', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))

    const result = await getBylaws({
      ...fast,
      env: { BYLAWS_ALLOW_DEGRADED: '1' },
    })

    expect(result).toEqual({ status: 'unavailable', reason: expect.stringMatching(/404/) })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('BYLAWS_ALLOW_DEGRADED'))
  })

  it('never suppresses a successful fetch', async () => {
    fetchMock.mockResolvedValue(new Response(BYLAWS))

    await expect(
      getBylaws({ ...fast, env: { BYLAWS_ALLOW_DEGRADED: '1' } }),
    ).resolves.toEqual({ status: 'ok', markdown: BYLAWS })
  })
})
