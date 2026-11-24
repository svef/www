import { describe, expect, it } from 'vitest'
import { missingForDraft } from './missing'

const base = {
  categories: ['marketing-website'],
  entryCategory: 'marketing-website',
  answers: {},
  entryAnswers: {},
  hasImage: false,
  termsAccepted: false,
  credentialCount: 0,
}
const keys = (m: ReturnType<typeof missingForDraft>) => m.map((i) => i.fieldKey)

describe('missingForDraft', () => {
  it('lists the required fields of an empty draft, with labels in both languages, once each', () => {
    const m = missingForDraft(base)
    expect(keys(m)).toEqual(expect.arrayContaining(['title', 'description', 'owners', 'links', 'campaignPeriod', 'publicCredit', 'termsAccepted']))
    expect(new Set(keys(m)).size).toBe(m.length)
    for (const i of m) {
      expect(i.label.is).toBeTruthy()
      expect(i.label.en).toBeTruthy()
    }
  })

  it('drops what is answered', () => {
    const m = missingForDraft({
      ...base,
      answers: { title: 'Sól', description: 'Lýsing' },
      termsAccepted: true,
    })
    for (const k of ['title', 'description', 'termsAccepted']) expect(keys(m)).not.toContain(k)
    expect(keys(m)).toContain('owners')
  })

  it('does not require login details unless the project requires login', () => {
    expect(keys(missingForDraft(base))).not.toContain('loginInformation')
    const needs = missingForDraft({ ...base, answers: { requiresLogin: true } })
    expect(keys(needs)).toContain('loginInformation')
    const given = missingForDraft({ ...base, answers: { requiresLogin: true }, credentialCount: 1 })
    expect(keys(given)).not.toContain('loginInformation')
  })

  it('treats the Logged-In Platform category as requiring login', () => {
    const m = missingForDraft({ ...base, categories: ['logged-in-platform'], entryCategory: 'logged-in-platform' })
    expect(keys(m)).toContain('loginInformation')
  })

  it('is empty when everything required is in place', () => {
    const m = missingForDraft({
      ...base,
      answers: {
        title: 'Sól',
        description: 'Lýsing',
        owners: [{ name: 'Anna', email: 'anna@example.is' }],
        links: ['https://example.is'],
        campaignPeriod: { start: '2026-01-01', end: '2026-02-01' },
        publicCredit: 'Acme',
      },
      termsAccepted: true,
    })
    expect(m).toEqual([])
  })
})
