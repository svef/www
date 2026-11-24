import { getAwardsDb } from '@/lib/awards/db/client'
import { requireStaff } from '@/lib/awards/auth/session'
import { buildInvoicingCsv, buildInvoicingXlsx } from '@/lib/awards/export/invoicing'
import { getExportRows, getStaffEdition, recordExport } from '@/lib/awards/staff/queries'

/**
 * The invoicing export. Staff only: an anonymous request is sent to sign-in and a
 * signed-in non-staff one gets a 404 (`requireStaff`). It reads the session cookie, so Next
 * never caches it, which is right: it reads billing details as they are now and writes the
 * audit rows.
 */

const TYPES = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const

export async function GET(request: Request): Promise<Response> {
  const user = await requireStaff({ next: '/is/innsendingar/starfsfolk' })
  const params = new URL(request.url).searchParams
  const format = params.get('format')
  if (format !== 'csv' && format !== 'xlsx') {
    return new Response('format must be csv or xlsx', { status: 400 })
  }
  const yearParam = params.get('year')
  const year = yearParam ? Number(yearParam) : undefined
  if (year !== undefined && !Number.isInteger(year)) {
    return new Response('year must be a number', { status: 400 })
  }

  const db = getAwardsDb()
  const edition = await getStaffEdition(db, year)
  if (!edition) return new Response('No such edition', { status: 404 })

  const rows = await getExportRows(db, edition.id)
  const body: BodyInit =
    format === 'csv'
      ? buildInvoicingCsv(rows)
      : (new Blob([(await buildInvoicingXlsx(rows)) as BlobPart]) as BodyInit)
  // Logged before the file leaves: a download nobody recorded must not exist.
  await recordExport(db, { actorUserId: user.id, format, rows })

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(body, {
    headers: {
      'Content-Type': TYPES[format],
      'Content-Disposition': `attachment; filename="reikningar-${edition.year}-${stamp}.${format}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
