import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
const postToSlack = vi.fn()

vi.mock('@/lib/payload', () => ({ getPayload: async () => ({ create }) }))
vi.mock('./slack', () => ({ postToSlack: (...args: unknown[]) => postToSlack(...args) }))

import { submitFeedback, submitTalkProposal } from './actions'
import { EMPTY_STATE } from './state'
import { LIMITS } from './options'

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  }
  return data
}

beforeEach(() => {
  create.mockReset().mockResolvedValue({})
  postToSlack.mockReset().mockResolvedValue({ ok: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('submitFeedback', () => {
  const valid = { subject: 'other', subjectOther: 'Vefurinn', message: 'Halló', locale: 'en' }

  it('rejects an empty submission with a key per missing field, storing nothing', async () => {
    const result = await submitFeedback(EMPTY_STATE, form({}))
    expect(result).toEqual({ status: 'error', errors: { subject: 'required', message: 'required' } })
    expect(create).not.toHaveBeenCalled()
    expect(postToSlack).not.toHaveBeenCalled()
  })

  it('requires the "other" text only when "other" is chosen', async () => {
    const result = await submitFeedback(EMPTY_STATE, form({ subject: 'other', message: 'x' }))
    expect(result.errors).toEqual({ subjectOther: 'required' })
  })

  it('rejects an unknown subject and a malformed email', async () => {
    const result = await submitFeedback(
      EMPTY_STATE,
      form({ subject: 'bogus', message: 'x', email: 'not-an-email' }),
    )
    expect(result.errors).toEqual({ subject: 'required', email: 'invalid' })
  })

  it('bounds field lengths', async () => {
    const result = await submitFeedback(
      EMPTY_STATE,
      form({ ...valid, message: 'x'.repeat(LIMITS.longText + 1), name: 'n'.repeat(LIMITS.name + 1) }),
    )
    expect(result.errors).toEqual({ message: 'tooLong', name: 'tooLong' })
  })

  it('stores the trimmed submission, then notifies', async () => {
    const result = await submitFeedback(EMPTY_STATE, form({ ...valid, message: '  Halló  ' }))
    expect(result).toEqual({ status: 'success' })
    expect(create).toHaveBeenCalledWith({
      collection: 'feedback',
      data: {
        subject: 'other',
        subjectOther: 'Vefurinn',
        message: 'Halló',
        name: undefined,
        email: undefined,
        locale: 'en',
      },
    })
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(postToSlack.mock.invocationCallOrder[0])
  })

  it('does not keep a stale "other" text when another subject is chosen', async () => {
    const subject = (await import('./options')).FEEDBACK_SUBJECTS.find((s) => s !== 'other')!
    await submitFeedback(EMPTY_STATE, form({ subject, subjectOther: 'leftover', message: 'x' }))
    expect(create.mock.calls[0][0].data.subjectOther).toBeUndefined()
  })

  it('falls back to Icelandic for an unknown locale', async () => {
    await submitFeedback(EMPTY_STATE, form({ ...valid, locale: 'de' }))
    expect(create.mock.calls[0][0].data.locale).toBe('is')
  })

  it('still thanks the visitor when Slack fails', async () => {
    postToSlack.mockResolvedValue({ ok: false, reason: 'unreachable', detail: 'down' })
    const result = await submitFeedback(EMPTY_STATE, form(valid))
    expect(result).toEqual({ status: 'success' })
    expect(create).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalled()
  })

  it('answers a filled honeypot with success and does nothing', async () => {
    const result = await submitFeedback(EMPTY_STATE, form({ ...valid, website: 'http://spam' }))
    expect(result).toEqual({ status: 'success' })
    expect(create).not.toHaveBeenCalled()
    expect(postToSlack).not.toHaveBeenCalled()
  })
})

describe('submitTalkProposal', () => {
  const valid = { name: 'Jóna', email: 'jona@example.is', title: 'Aðgengi', summary: 'Um aðgengi' }

  it('requires name, email, title and summary', async () => {
    const result = await submitTalkProposal(EMPTY_STATE, form({}))
    expect(result.errors).toEqual({
      name: 'required',
      email: 'required',
      title: 'required',
      summary: 'required',
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('flags a malformed email as invalid, not required', async () => {
    const result = await submitTalkProposal(EMPTY_STATE, form({ ...valid, email: 'jona@' }))
    expect(result.errors).toEqual({ email: 'invalid' })
  })

  it('keeps only known topics', async () => {
    const { TALK_TOPICS } = await import('./options')
    await submitTalkProposal(EMPTY_STATE, form({ ...valid, topics: [TALK_TOPICS[0], 'made-up'] }))
    expect(create.mock.calls[0][0]).toMatchObject({
      collection: 'talk-proposals',
      data: { topics: [TALK_TOPICS[0]], locale: 'is' },
    })
  })

  it('answers a filled honeypot with success and does nothing', async () => {
    const result = await submitTalkProposal(EMPTY_STATE, form({ ...valid, website: 'x' }))
    expect(result).toEqual({ status: 'success' })
    expect(create).not.toHaveBeenCalled()
  })
})
