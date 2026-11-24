import { describe, expect, it } from 'vitest'
import { billing, entry, lockedEntry, proj } from './fixtures'
import { entriesWithoutBilling, invoiceNotes } from './invoice'

describe('invoiceNotes', () => {
  it('sums the locked prices of submitted entries per billing profile, across projects', () => {
    const notes = invoiceNotes([
      proj({ id: 'a', billing: billing('b1', 'Acme ehf.'), entries: [lockedEntry(18900), lockedEntry(6900, { id: 'e2' })] }),
      proj({ id: 'b', billing: billing('b1', 'Acme ehf.'), entries: [lockedEntry(26900)] }),
      proj({ id: 'c', billing: billing('b2', 'Bolti ehf.'), entries: [lockedEntry(10900)] }),
    ])
    expect(notes.map((n) => [n.billing.companyName, n.total, n.entries])).toEqual([
      ['Acme ehf.', 52700, 3],
      ['Bolti ehf.', 10900, 1],
    ])
  })

  it('leaves out drafts and withdrawn entries, and counts every submitted-like status', () => {
    const [note] = invoiceNotes([
      proj({
        billing: billing('b1', 'Acme ehf.'),
        entries: [
          entry({ status: 'draft' }),
          entry({ status: 'withdrawn', price: 26900 }),
          lockedEntry(1000, { status: 'eligibility_pending' }),
          lockedEntry(2000, { status: 'eligible' }),
          lockedEntry(4000, { status: 'ineligible' }),
          lockedEntry(8000, { status: 'needs_clarification' }),
          lockedEntry(16000),
        ],
      }),
    ])
    expect(note.total).toBe(31000)
    expect(note.entries).toBe(5)
  })

  it('makes no note for a profile with nothing submitted yet', () => {
    expect(invoiceNotes([proj({ billing: billing('b1', 'Acme ehf.'), entries: [entry()] })])).toEqual([])
  })

  it('leaves out billing profiles the viewer does not own', () => {
    expect(
      invoiceNotes([proj({ billing: billing('b1', 'Hers ehf.', false), entries: [lockedEntry(18900)] })]),
    ).toEqual([])
  })

  it('counts submitted entries on projects with no billing profile', () => {
    expect(
      entriesWithoutBilling([
        proj({ entries: [lockedEntry(1), entry()] }),
        proj({ id: 'x', billing: billing('b', 'X'), entries: [lockedEntry(1)] }),
      ]),
    ).toBe(1)
  })
})
