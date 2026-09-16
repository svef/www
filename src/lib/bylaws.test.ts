import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBylawsMarkdown } from './bylaws'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
})

describe('getBylawsMarkdown', () => {
  it('requests the default branch of svef/Laws via the HEAD ref', async () => {
    fetchMock.mockResolvedValue(new Response('# Lög Samtaka Vefiðnaðarins'))

    await getBylawsMarkdown()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://raw.githubusercontent.com/svef/Laws/HEAD/README.md',
    )
  })

  it('returns the Markdown when the fetch succeeds', async () => {
    fetchMock.mockResolvedValue(new Response('# Lög Samtaka Vefiðnaðarins'))

    await expect(getBylawsMarkdown()).resolves.toBe('# Lög Samtaka Vefiðnaðarins')
  })

  it('throws on a non-OK response rather than degrading silently', async () => {
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))

    await expect(getBylawsMarkdown()).rejects.toThrow(/404/)
  })

  it('throws when the network call fails', async () => {
    fetchMock.mockRejectedValue(new Error('ENOTFOUND'))

    await expect(getBylawsMarkdown()).rejects.toThrow(/Failed to fetch SVEF bylaws/)
  })

  it('throws when the source is empty', async () => {
    fetchMock.mockResolvedValue(new Response('   \n'))

    await expect(getBylawsMarkdown()).rejects.toThrow(/is empty/)
  })
})
