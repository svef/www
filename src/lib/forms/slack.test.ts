import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postToSlack } from './slack'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SLACK_WEBHOOK_FEEDBACK', 'https://hooks.example/feedback')
  vi.stubEnv('SLACK_WEBHOOK_TALKS', '')
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('postToSlack', () => {
  it('reports a missing webhook instead of throwing or fetching', async () => {
    const result = await postToSlack('talks', 'Hi', [])
    expect(result).toEqual({ ok: false, reason: 'not-configured', detail: 'SLACK_WEBHOOK_TALKS' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts labelled lines and drops blank values', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    const result = await postToSlack('feedback', 'Ný ábending', [
      { label: 'Efni', value: ' bug ' },
      { label: 'Nafn', value: '   ' },
      { label: 'Netfang', value: null },
      { label: 'Skilaboð', value: 'Halló' },
    ])
    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://hooks.example/feedback')
    expect(JSON.parse(init.body).text).toBe('*Ný ábending*\n\n*Efni:* bug\n*Skilaboð:* Halló')
  })

  it('reports a rejection with its status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
    expect(await postToSlack('feedback', 'x', [])).toEqual({
      ok: false,
      reason: 'rejected',
      detail: '404 Not Found',
    })
  })

  it('reports an unreachable Slack rather than rejecting', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    expect(await postToSlack('feedback', 'x', [])).toEqual({
      ok: false,
      reason: 'unreachable',
      detail: 'boom',
    })
  })
})
