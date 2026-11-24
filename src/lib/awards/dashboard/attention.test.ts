import { describe, expect, it } from 'vitest'
import { attentionItems, projectTotals } from './attention'
import { entry, lockedEntry, proj } from './fixtures'

const ctx = {
  now: '2026-12-25T12:00:00Z',
  earlyBirdEndsBefore: '2027-01-05T00:00:00Z',
  intakeClosesBefore: '2027-02-02T00:00:00Z',
}
const req = (id: string, deadlineAt: string) => ({ id, entryId: 'e', message: 'm', deadlineAt })
const missing = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ fieldKey: `f${i}`, label: { is: 'Reitur', en: 'Field' } }))

describe('attentionItems', () => {
  it('lists open requests, overdue or not, with the earliest deadline', () => {
    const items = attentionItems(
      [
        proj({
          id: 'a',
          entries: [lockedEntry(1, { requests: [req('r1', '2027-01-10T00:00:00Z'), req('r2', '2026-12-20T00:00:00Z')] })],
        }),
      ],
      ctx,
    )
    expect(items).toEqual([
      {
        projectId: 'a',
        title: 'Project',
        reasons: [{ kind: 'request', count: 2, deadlineAt: '2026-12-20T00:00:00.000Z', overdue: true }],
      },
    ])
  })

  it('lists drafts against the next deadline, with the most fields any of them still lacks', () => {
    const [item] = attentionItems(
      [proj({ id: 'd', entries: [entry({ id: 'e1', missing: missing(3) }), entry({ id: 'e2', missing: missing(1) })] })],
      ctx,
    )
    expect(item.reasons).toEqual([
      { kind: 'drafts', count: 2, missing: 3, deadlineAt: '2027-01-05T00:00:00.000Z' },
    ])
  })

  it('leaves out projects with nothing to do, and drafts once intake has closed', () => {
    expect(attentionItems([proj({ entries: [lockedEntry(1)] })], ctx)).toEqual([])
    expect(attentionItems([proj({ entries: [entry()] })], { ...ctx, now: '2027-03-01T00:00:00Z' })).toEqual([])
  })

  it('keeps the given order and stops at the limit', () => {
    const many = ['a', 'b', 'c'].map((id) => proj({ id, entries: [entry()] }))
    expect(attentionItems(many, ctx, 2).map((i) => i.projectId)).toEqual(['a', 'b'])
  })
})

describe('projectTotals', () => {
  it('counts projects, sent entries and drafts, not withdrawn ones', () => {
    expect(
      projectTotals([
        proj({ entries: [entry(), lockedEntry(1), entry({ status: 'withdrawn' })] }),
        proj({ id: 'p2', entries: [lockedEntry(1, { status: 'eligible' })] }),
        proj({ id: 'p3' }),
      ]),
    ).toEqual({ projects: 3, submitted: 2, drafts: 1 })
  })
})
