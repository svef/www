import { describe, expect, it } from 'vitest'
import { emptyCounts, foldCounts } from './overview'

const cats = [
  { id: 'a', name: { is: 'Fyrirtækjavefur', en: 'Corporate website' } },
  { id: 'b', name: { is: 'Vefverslun', en: 'E-commerce' } },
]

describe('foldCounts', () => {
  it('gives every category every status, in the given order, with totals', () => {
    const out = foldCounts(cats, [
      { categoryId: 'b', status: 'submitted', n: 3 },
      { categoryId: 'a', status: 'draft', n: 2 },
      { categoryId: 'a', status: 'eligible', n: 1 },
    ])
    expect(out.categories.map((c) => c.id)).toEqual(['a', 'b'])
    expect(out.categories[0]).toMatchObject({ total: 3, counts: { ...emptyCounts(), draft: 2, eligible: 1 } })
    expect(out.categories[1]).toMatchObject({ total: 3, counts: { ...emptyCounts(), submitted: 3 } })
    expect(out.totals).toEqual({ ...emptyCounts(), draft: 2, eligible: 1, submitted: 3 })
    expect(out.entries).toBe(6)
  })

  it('keeps a category with nothing in it, and ignores rows it cannot place', () => {
    const out = foldCounts(cats, [
      { categoryId: 'gone', status: 'submitted', n: 4 },
      { categoryId: 'a', status: 'bogus', n: 9 },
    ])
    expect(out.categories.every((c) => c.total === 0)).toBe(true)
    expect(out.entries).toBe(0)
  })
})
