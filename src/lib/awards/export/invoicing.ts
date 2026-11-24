import writeExcelFile from 'write-excel-file/node'
import { isSubmittedLike, type EntryStatus } from '../types'

/**
 * The invoicing export (spec §9). This module is pure: rows in, file content
 * out. Reading the rows is `staff/queries.ts`; the route only streams the result.
 *
 * The system creates no invoices. After close staff export the submitted,
 * non-withdrawn entries grouped by the kennitala of the billing profile, with the
 * profile's details as they are *now* and each entry's locked price.
 */

export type BillingDetails = {
  kennitala: string
  companyName: string
  invoiceEmail: string
  address: string
  reference: string | null
}

export type ExportRow = {
  entryId: string
  /** Carried for the audit trail; not part of the file. */
  projectId?: string
  status: EntryStatus
  projectTitle: string
  /** The category's Icelandic name. */
  categoryName: string
  submittedAt: Date | null
  priceRegular: number | null
  discountPercent: number | null
  /** The locked price, whole ISK. */
  priceAmount: number | null
  /** The project's billing profile as it is at export time; null when none is set. */
  billing: BillingDetails | null
  /** Breaks ties between profiles sharing a kennitala: the most recently edited wins. */
  billingUpdatedAt?: Date | null
}

export type ExportEntry = {
  entryId: string
  status: EntryStatus
  projectTitle: string
  categoryName: string
  submittedAt: Date | null
  priceRegular: number
  discountPercent: number
  priceAmount: number
}

export type ExportGroup = {
  /** Null for the "missing billing profile" group. */
  billing: BillingDetails | null
  entries: ExportEntry[]
  total: number
}

export type InvoicingReport = {
  groups: ExportGroup[]
  /** Entries whose project has no billing profile. */
  missing: ExportGroup
  entryCount: number
  total: number
}

const byText = (a: string, b: string) => a.localeCompare(b, 'is')

/** Keeps submitted, non-withdrawn entries, groups them by kennitala and totals them. */
export function buildInvoicingReport(rows: readonly ExportRow[]): InvoicingReport {
  const included = rows.filter((r) => isSubmittedLike(r.status))
  const byKennitala = new Map<string, { row: ExportRow; entries: ExportEntry[] }>()
  const missing: ExportEntry[] = []

  for (const r of included) {
    const entry: ExportEntry = {
      entryId: r.entryId,
      status: r.status,
      projectTitle: r.projectTitle,
      categoryName: r.categoryName,
      submittedAt: r.submittedAt,
      priceRegular: r.priceRegular ?? 0,
      discountPercent: r.discountPercent ?? 0,
      priceAmount: r.priceAmount ?? 0,
    }
    if (!r.billing) {
      missing.push(entry)
      continue
    }
    const group = byKennitala.get(r.billing.kennitala)
    if (!group) {
      byKennitala.set(r.billing.kennitala, { row: r, entries: [entry] })
      continue
    }
    group.entries.push(entry)
    // Several profiles can share a kennitala (an agency per client): show the freshest.
    if ((r.billingUpdatedAt?.getTime() ?? 0) > (group.row.billingUpdatedAt?.getTime() ?? 0)) {
      group.row = r
    }
  }

  const sortEntries = (entries: ExportEntry[]) =>
    entries.sort(
      (a, b) =>
        (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0) ||
        byText(a.projectTitle, b.projectTitle) ||
        byText(a.categoryName, b.categoryName),
    )
  const sum = (entries: ExportEntry[]) => entries.reduce((n, e) => n + e.priceAmount, 0)

  const groups = [...byKennitala.values()]
    .map(({ row, entries }): ExportGroup => {
      sortEntries(entries)
      return { billing: row.billing, entries, total: sum(entries) }
    })
    .sort(
      (a, b) =>
        byText(a.billing!.companyName, b.billing!.companyName) ||
        byText(a.billing!.kennitala, b.billing!.kennitala),
    )
  sortEntries(missing)

  return {
    groups,
    missing: { billing: null, entries: missing, total: sum(missing) },
    entryCount: included.length,
    total: groups.reduce((n, g) => n + g.total, 0) + sum(missing),
  }
}

// ------------------------------------------------------------------- Table

/** A cell: text, a whole number (ISK, percent, counts), or empty. */
export type Cell = string | number | null

export type ExportTable = {
  header: string[]
  rows: Cell[][]
  /** Indexes into `rows` of subtotal and total rows, for bold in the XLSX. */
  summaryRows: number[]
  /** Zero-based columns that hold text even when they look like numbers (kennitala). */
  textColumns: number[]
}

export const HEADER = [
  'Kennitala',
  'Fyrirtæki',
  'Netfang reiknings',
  'Heimilisfang',
  'Tilvísun',
  'Verkefni',
  'Flokkur',
  'Staða',
  'Innsent',
  'Listaverð (kr.)',
  'Afsláttur (%)',
  'Verð (kr.)',
] as const

const PRICE_COLUMNS = [9, 10, 11]
const LABEL = {
  subtotal: 'Samtals',
  grand: 'Samtals alls',
  missing: 'Vantar reikningsupplýsingar',
} as const

const STATUS_IS: Record<EntryStatus, string> = {
  draft: 'Drög',
  submitted: 'Innsent',
  eligibility_pending: 'Hæfi í skoðun',
  eligible: 'Gjaldgengt',
  ineligible: 'Ekki gjaldgengt',
  needs_clarification: 'Bíður skýringa',
  withdrawn: 'Dregið til baka',
}

/** `2027-01-05 13:22`, in UTC, which is Iceland's own time all year. */
export function formatSubmittedAt(date: Date | null): string {
  return date ? date.toISOString().slice(0, 16).replace('T', ' ') : ''
}

export function buildInvoicingTable(report: InvoicingReport): ExportTable {
  const rows: Cell[][] = []
  const summaryRows: number[] = []
  const blank = (): Cell[] => HEADER.map(() => null)

  const addGroup = (group: ExportGroup, label: string) => {
    if (group.entries.length === 0) return
    const b = group.billing
    const lead: Cell[] = b
      ? [b.kennitala, b.companyName, b.invoiceEmail, b.address, b.reference ?? '']
      : ['', LABEL.missing, '', '', '']
    for (const e of group.entries) {
      rows.push([
        ...lead,
        e.projectTitle,
        e.categoryName,
        STATUS_IS[e.status],
        formatSubmittedAt(e.submittedAt),
        e.priceRegular,
        e.discountPercent,
        e.priceAmount,
      ])
    }
    const subtotal = blank()
    subtotal[0] = lead[0]
    subtotal[1] = lead[1]
    subtotal[5] = `${label} (${group.entries.length})`
    subtotal[11] = group.total
    summaryRows.push(rows.length)
    rows.push(subtotal)
  }

  for (const g of report.groups) addGroup(g, LABEL.subtotal)
  addGroup(report.missing, LABEL.subtotal)

  const grand = blank()
  grand[5] = `${LABEL.grand} (${report.entryCount})`
  grand[11] = report.total
  summaryRows.push(rows.length)
  rows.push(grand)

  return { header: [...HEADER], rows, summaryRows, textColumns: [0] }
}

// --------------------------------------------------------------------- CSV

/** Excel reads a UTF-8 file as ANSI unless it starts with this, and then þ ð æ ö turn to mojibake. */
export const BOM = '﻿'

/**
 * Icelandic Excel splits CSV on `;` (the comma is its decimal mark), so that is
 * the default; the XLSX is the format that needs no such guess.
 */
export const DEFAULT_CSV_DELIMITER = ';'

/**
 * Text that Excel would run as a formula (`=`, `+`, `-`, `@`, tab, CR at the start)
 * gets a leading single quote, the convention OWASP recommends. Project titles are
 * written by entrants, so this matters.
 */
export function neutraliseFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

function csvField(cell: Cell, delimiter: string): string {
  if (cell === null) return ''
  if (typeof cell === 'number') return String(cell)
  const text = neutraliseFormula(cell)
  return /["\r\n]/.test(text) || text.includes(delimiter)
    ? `"${text.replaceAll('"', '""')}"`
    : text
}

export function toCsv(table: ExportTable, delimiter = DEFAULT_CSV_DELIMITER): string {
  const lines = [table.header, ...table.rows].map((row) =>
    row.map((cell) => csvField(cell, delimiter)).join(delimiter),
  )
  // CRLF is what Excel writes and every reader accepts.
  return BOM + lines.join('\r\n') + '\r\n'
}

export function buildInvoicingCsv(
  rows: readonly ExportRow[],
  delimiter = DEFAULT_CSV_DELIMITER,
): string {
  return toCsv(buildInvoicingTable(buildInvoicingReport(rows)), delimiter)
}

// -------------------------------------------------------------------- XLSX

export async function toXlsx(table: ExportTable): Promise<Uint8Array> {
  const summary = new Set(table.summaryRows)
  const header = table.header.map((value) => ({
    value,
    fontWeight: 'bold' as const,
    borderStyle: 'thin' as const,
  }))
  const body = table.rows.map((row, r) =>
    row.map((cell, c) => {
      const bold = summary.has(r) ? { fontWeight: 'bold' as const } : {}
      if (cell === null) return bold.fontWeight ? { value: '', ...bold } : null
      if (typeof cell === 'number') {
        return {
          value: cell,
          type: Number,
          ...(PRICE_COLUMNS.includes(c) ? { format: '#,##0' } : {}),
          ...bold,
        }
      }
      // Text stays text: a kennitala must keep its leading zero, and nothing is a formula.
      return { value: cell, type: String, ...bold }
    }),
  )
  const columns = [14, 28, 28, 34, 16, 34, 30, 16, 17, 14, 13, 13].map((width) => ({ width }))
  const file = writeExcelFile(
    [
      {
        data: [header, ...body],
        sheet: 'Reikningar',
        columns,
        stickyRowsCount: 1,
      },
    ],
  )
  return new Uint8Array(await file.toBuffer())
}

export async function buildInvoicingXlsx(rows: readonly ExportRow[]): Promise<Uint8Array> {
  return toXlsx(buildInvoicingTable(buildInvoicingReport(rows)))
}
