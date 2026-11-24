import { describe, expect, it } from 'vitest'
import { entry, lockedEntry, proj } from './fixtures'
import { DRAFT_URGENCY_DAYS, needsAction, rankEntries, rankProjects, urgencyOf } from './rank'

const ctx = {
  now: '2026-12-25T12:00:00Z',
  earlyBirdEndsBefore: '2027-01-05T00:00:00Z',
  intakeClosesBefore: '2027-02-02T00:00:00Z',
}
const req = (id: string, deadlineAt: string) => ({ id, entryId: 'e', message: 'm', deadlineAt })
const ids = (ps: { id: string }[]) => ps.map((p) => p.id)

describe('rankProjects', () => {
  it('puts requests first, soonest deadline first, overdue ones leading', () => {
    const ranked = rankProjects(
      [
        proj({ id: 'plain', entries: [lockedEntry(1)] }),
        proj({ id: 'late', entries: [entry({ status: 'needs_clarification', requests: [req('r', '2027-02-10T00:00:00Z')] })] }),
        proj({ id: 'overdue', entries: [lockedEntry(1, { requests: [req('r', '2026-12-01T00:00:00Z')] })] }),
        proj({ id: 'soon', entries: [lockedEntry(1, { requests: [req('r', '2026-12-24T00:00:00Z'), req('r2', '2027-03-01T00:00:00Z')] })] }),
      ],
      ctx,
    )
    expect(ids(ranked)).toEqual(['overdue', 'soon', 'late', 'plain'])
  })

  it('ranks requests above drafts close to a deadline, and drafts above the rest', () => {
    const ranked = rankProjects(
      [
        proj({ id: 'rest', updatedAt: '2026-12-19T00:00:00Z', entries: [lockedEntry(1)] }),
        proj({ id: 'draft', updatedAt: '2026-12-01T00:00:00Z', entries: [entry()] }),
        proj({ id: 'request', updatedAt: '2026-11-01T00:00:00Z', entries: [lockedEntry(1, { requests: [req('r', '2027-03-01T00:00:00Z')] })] }),
      ],
      ctx,
    )
    expect(ids(ranked)).toEqual(['request', 'draft', 'rest'])
  })

  it('treats a draft as urgent only within the window before the next deadline', () => {
    const draft = [entry()]
    // 16 days before the early-bird bound: not yet.
    expect(urgencyOf(draft, { ...ctx, now: '2026-12-20T00:00:00Z' }).tier).toBe('rest')
    const edge = new Date(Date.parse(ctx.earlyBirdEndsBefore) - DRAFT_URGENCY_DAYS * 86_400_000).toISOString()
    expect(urgencyOf(draft, { ...ctx, now: edge }).tier).toBe('draft')
    expect(urgencyOf(draft, { ...ctx, now: new Date(Date.parse(edge) - 1).toISOString() }).tier).toBe('rest')
  })

  it('races the closing date once the early bird is over, and ignores drafts once closed', () => {
    const draft = [entry()]
    expect(urgencyOf(draft, { ...ctx, now: '2027-01-10T00:00:00Z' }).tier).toBe('rest')
    expect(urgencyOf(draft, { ...ctx, now: '2027-01-25T00:00:00Z' })).toEqual({
      tier: 'draft',
      at: Date.parse('2027-02-02T00:00:00Z'),
    })
    expect(urgencyOf(draft, { ...ctx, now: '2027-02-02T00:00:00Z' }).tier).toBe('rest')
  })

  it('only counts drafts, not submitted entries, as needing action near a deadline', () => {
    expect(needsAction(proj({ entries: [lockedEntry(1)] }), { ...ctx, now: '2027-01-04T00:00:00Z' })).toBe(false)
    expect(needsAction(proj({ entries: [entry()] }), { ...ctx, now: '2027-01-04T00:00:00Z' })).toBe(true)
  })

  it('orders the rest by most recent change, then id, and is stable', () => {
    const a = proj({ id: 'a', updatedAt: '2026-12-01T00:00:00Z' })
    const b = proj({ id: 'b', updatedAt: '2026-12-05T00:00:00Z' })
    const c = proj({ id: 'c', updatedAt: '2026-12-05T00:00:00Z' })
    expect(ids(rankProjects([a, c, b], ctx))).toEqual(['b', 'c', 'a'])
    expect(ids(rankProjects([b, a, c], ctx))).toEqual(['b', 'c', 'a'])
  })

  it('does not mutate its input', () => {
    const input = [proj({ id: 'a' }), proj({ id: 'b', entries: [entry()] })]
    rankProjects(input, ctx)
    expect(ids(input)).toEqual(['a', 'b'])
  })
})

describe('rankEntries', () => {
  it('puts requested entries first (soonest first), then drafts, then the rest in given order', () => {
    const out = rankEntries([
      lockedEntry(1, { id: 'sub1' }),
      entry({ id: 'draft' }),
      lockedEntry(1, { id: 'req-late', requests: [req('r', '2027-02-01T00:00:00Z')] }),
      lockedEntry(1, { id: 'sub2' }),
      lockedEntry(1, { id: 'req-soon', requests: [req('r', '2026-12-25T00:00:00Z')] }),
    ])
    expect(out.map((e) => e.id)).toEqual(['req-soon', 'req-late', 'draft', 'sub1', 'sub2'])
  })
})
