// @vitest-environment node
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  BOM,
  buildInvoicingCsv,
  buildInvoicingReport,
  buildInvoicingTable,
  buildInvoicingXlsx,
  neutraliseFormula,
  type BillingDetails,
  type ExportRow,
} from './invoicing'

const acme: BillingDetails = {
  kennitala: '5501692829',
  companyName: 'Þórsmörk ehf.',
  invoiceEmail: 'reikningar@thorsmork.is',
  address: 'Ægisgata 1, 101 Reykjavík',
  reference: 'PO-7',
}
const bolt: BillingDetails = {
  kennitala: '0101302399',
  companyName: 'Bolti ehf.',
  invoiceEmail: 'b@bolti.is',
  address: 'Torg 2',
  reference: null,
}

let n = 0
function row(over: Partial<ExportRow> = {}): ExportRow {
  n += 1
  return {
    entryId: `e${n}`,
    status: 'submitted',
    projectTitle: `Verkefni ${n}`,
    categoryName: 'Besti vefurinn',
    submittedAt: new Date(Date.UTC(2027, 0, 5, 13, 22)),
    priceRegular: 26900,
    discountPercent: 30,
    priceAmount: 18900,
    billing: acme,
    ...over,
  }
}

describe('buildInvoicingReport', () => {
  it('groups by kennitala with per-group and overall totals', () => {
    const report = buildInvoicingReport([
      row({ billing: acme }),
      row({ billing: bolt, priceAmount: 9900, priceRegular: 9900, discountPercent: 0 }),
      row({ billing: acme, priceAmount: 6900 }),
    ])
    expect(report.groups.map((g) => g.billing?.kennitala)).toEqual(['0101302399', '5501692829'])
    expect(report.groups.map((g) => g.total)).toEqual([9900, 25800])
    expect(report.groups[1].entries).toHaveLength(2)
    expect(report.total).toBe(35700)
    expect(report.entryCount).toBe(3)
    expect(report.missing.entries).toEqual([])
  })

  it('lists several projects under one kennitala, even from different profiles', () => {
    const other = { ...acme, companyName: 'Þórsmörk ehf. (nýtt nafn)', reference: 'PO-8' }
    const report = buildInvoicingReport([
      row({ billing: acme, billingUpdatedAt: new Date('2027-01-01') }),
      row({ billing: other, billingUpdatedAt: new Date('2027-01-10') }),
    ])
    expect(report.groups).toHaveLength(1)
    expect(report.groups[0].entries).toHaveLength(2)
    // Details are the freshest profile's.
    expect(report.groups[0].billing?.companyName).toBe('Þórsmörk ehf. (nýtt nafn)')
  })

  it('leaves out withdrawn entries and drafts', () => {
    const report = buildInvoicingReport([
      row({ status: 'withdrawn', priceAmount: null }),
      row({ status: 'draft', priceAmount: null }),
      row({ status: 'eligible' }),
      row({ status: 'ineligible' }),
      row({ status: 'needs_clarification' }),
      row({ status: 'eligibility_pending' }),
    ])
    expect(report.entryCount).toBe(4)
    expect(report.total).toBe(4 * 18900)
  })

  it('puts entries without a billing profile in their own group', () => {
    const report = buildInvoicingReport([row({ billing: null }), row()])
    expect(report.groups).toHaveLength(1)
    expect(report.missing.entries).toHaveLength(1)
    expect(report.missing.total).toBe(18900)
    expect(report.total).toBe(2 * 18900)
  })

  it('orders groups by company and entries by submission time', () => {
    const early = row({ submittedAt: new Date('2027-01-02T10:00:00Z'), projectTitle: 'B' })
    const late = row({ submittedAt: new Date('2027-01-03T10:00:00Z'), projectTitle: 'A' })
    const report = buildInvoicingReport([late, early])
    expect(report.groups[0].entries.map((e) => e.projectTitle)).toEqual(['B', 'A'])
  })
})

describe('buildInvoicingTable', () => {
  it('writes entries, a subtotal per kennitala, the missing group and a grand total', () => {
    const table = buildInvoicingTable(
      buildInvoicingReport([row(), row({ billing: null })]),
    )
    // acme entry, acme subtotal, missing entry, missing subtotal, grand total
    expect(table.rows).toHaveLength(5)
    expect(table.summaryRows).toEqual([1, 3, 4])
    expect(table.rows[1][11]).toBe(18900)
    expect(table.rows[2][1]).toBe('Vantar reikningsupplýsingar')
    expect(table.rows[4][11]).toBe(37800)
  })
})

describe('buildInvoicingCsv', () => {
  const csv = buildInvoicingCsv([
    row({ projectTitle: 'Vefur með "gæsalöppum"; og semíkommu' }),
    row({ billing: bolt, projectTitle: 'Öðruvísi þáttur, ð æ' }),
  ])

  it('starts with a UTF-8 byte order mark so Excel reads the encoding', () => {
    expect(csv.startsWith(BOM)).toBe(true)
    const bytes = Buffer.from(csv, 'utf8')
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('keeps Icelandic characters intact', () => {
    const decoded = new TextDecoder('utf-8').decode(Buffer.from(csv, 'utf8'))
    for (const text of ['Þórsmörk ehf.', 'Ægisgata 1, 101 Reykjavík', 'Öðruvísi þáttur']) {
      expect(decoded).toContain(text)
    }
  })

  it('quotes fields holding the delimiter, quotes or commas, and doubles quotes', () => {
    expect(csv).toContain('"Vefur með ""gæsalöppum""; og semíkommu"')
    // A comma is not the delimiter, so it needs no quoting.
    expect(csv).toContain(';Öðruvísi þáttur, ð æ;')
  })

  it('has a header, entry rows, subtotals and a grand total, with CRLF endings', () => {
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0].split(';')[0]).toBe('Kennitala')
    // header + 2 entries + 2 subtotals + grand total + trailing empty
    expect(lines).toHaveLength(7)
    expect(lines.at(-2)).toContain('Samtals alls (2);')
    expect(lines.at(-2)?.endsWith(';37800')).toBe(true)
  })

  it('can use a comma delimiter', () => {
    const comma = buildInvoicingCsv([row()], ',')
    expect(comma.split('\r\n')[0]).toContain('Kennitala,Fyrirtæki,')
  })

  it('neutralises spreadsheet formulas in entrant text', () => {
    expect(neutraliseFormula('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`)
    expect(neutraliseFormula('+1')).toBe("'+1")
    expect(neutraliseFormula('-2')).toBe("'-2")
    expect(neutraliseFormula('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(neutraliseFormula('Venjulegt')).toBe('Venjulegt')
    expect(buildInvoicingCsv([row({ projectTitle: '=1+1' })])).toContain(";'=1+1;")
  })
})

describe('buildInvoicingXlsx', () => {
  it('produces a workbook whose text keeps Icelandic characters and formulas inert', async () => {
    const bytes = await buildInvoicingXlsx([
      row({ projectTitle: '=1+1' }),
      row({ billing: bolt }),
    ])
    // A zip: "PK".
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const files = unzipSync(bytes)
    expect(Object.keys(files)).toContain('xl/workbook.xml')
    const xml = Object.entries(files)
      .filter(([name]) => name.startsWith('xl/') && name.endsWith('.xml'))
      .map(([, data]) => strFromU8(data))
      .join('\n')
    expect(xml).toContain('Þórsmörk ehf.')
    expect(xml).toContain('Reikningar')
    expect(xml).toContain('Samtals alls (2)')
    // Written as text, never as a formula.
    expect(xml).not.toMatch(/<f>/)
    // The kennitala keeps its leading zero as text.
    expect(xml).toContain('<t>0101302399</t>')
    expect(xml).toContain('<t>=1+1</t>')
  })
})
