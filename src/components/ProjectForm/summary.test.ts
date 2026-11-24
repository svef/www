import { describe, expect, it } from 'vitest'
import { missingItems, priceBreakdown } from './summary'

const earlyBird = { endsBefore: '2027-01-05T00:00:00.000Z', discountPercent: 30 }
const noPrice = (category: string) => ({ category, price: null })

describe('priceBreakdown', () => {
  it('is zero for nothing chosen', () => {
    const b = priceBreakdown([], [], earlyBird, '2026-12-10T00:00:00Z')
    expect(b).toMatchObject({ lines: [], totalRegular: 0, totalEarly: 0, totalNow: 0 })
  })

  it('prices each category at both rates and sums them', () => {
    const cats = ['company-website-medium', 'student-project']
    const b = priceBreakdown(cats, cats.map(noPrice), earlyBird, '2026-12-10T00:00:00Z')
    expect(b.lines.map((l) => [l.slug, l.regular, l.early])).toEqual([
      ['company-website-medium', 26900, 18900],
      ['student-project', 2900, 1900],
    ])
    expect(b.totalRegular).toBe(29800)
    expect(b.totalEarly).toBe(20800)
    expect(b.earlyAvailable).toBe(true)
    expect(b.totalNow).toBe(20800)
  })

  it('uses the regular price once the early-bird deadline has passed (exclusive bound)', () => {
    const cats = ['app']
    const before = priceBreakdown(cats, [noPrice('app')], earlyBird, '2027-01-04T23:59:59.999Z')
    const at = priceBreakdown(cats, [noPrice('app')], earlyBird, '2027-01-05T00:00:00Z')
    expect(before.totalNow).toBe(18900)
    expect(at.earlyAvailable).toBe(false)
    expect(at.totalNow).toBe(26900)
  })

  it('keeps the locked price of a submitted entry, whatever the date', () => {
    const entries = [
      { category: 'app', price: { regular: 26900, discountPercent: 30, amount: 18900 } },
      noPrice('community-website'),
    ]
    const b = priceBreakdown(
      ['app', 'community-website'],
      entries,
      earlyBird,
      '2027-01-20T00:00:00Z',
    )
    expect(b.lines[0].locked).toBe(18900)
    expect(b.totalNow).toBe(18900 + 9900)
    expect(b.totalEarly).toBe(18900 + 6900)
    expect(b.totalRegular).toBe(18900 + 9900)
  })

  it('ignores a slug that is not a category', () => {
    expect(priceBreakdown(['nope'], [], earlyBird, '2026-12-10T00:00:00Z').lines).toEqual([])
  })
})

describe('missingItems', () => {
  it('asks for a category and a billing profile first when nothing is done', () => {
    expect(missingItems([], {}, null).map((i) => i.key)).toEqual(['categories', 'billing'])
  })

  it('lists each incomplete field once, in form order, with its section', () => {
    const items = missingItems(['marketing-website'], { owners: [{ name: 'A' }] }, null)
    expect(items.map((i) => [i.key, i.section])).toEqual([
      ['title', 'project'],
      ['description', 'project'],
      ['links', 'project'],
      ['campaignPeriod', 'questions'],
      ['owners', 'people'],
      ['publicCredit', 'people'],
      ['billing', 'billing'],
    ])
    expect(items.find((i) => i.key === 'title')?.fieldKey).toBe('title')
    expect(items.find((i) => i.key === 'title')?.message.en).toBe(
      'Project title: This field is required.',
    )
    expect(items.find((i) => i.key === 'billing')?.fieldKey).toBeUndefined()
  })

  it('only lists questions the chosen categories ask', () => {
    const keys = missingItems(['app'], {}, 'b1').map((i) => i.key)
    expect(keys).not.toContain('campaignPeriod')
    expect(keys).not.toContain('technicalAchievement')
    expect(keys).toContain('appLinks')
  })

  it('never lists the terms checkbox, which belongs to the submit step', () => {
    expect(missingItems(['app'], {}, null).map((i) => i.key)).not.toContain('termsAccepted')
  })

  it('is empty when everything is filled in', () => {
    const answers = {
      title: 'T',
      description: 'D',
      appLinks: ['https://example.is'],
      owners: [{ name: 'A', email: 'a@example.is' }],
      publicCredit: 'A',
    }
    expect(missingItems(['app'], answers, 'b1')).toEqual([])
  })
})
