import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { getStaffEdition } from '@/lib/awards/staff/queries'
import { isLocale, localePath } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'
import { AppHead } from '@/components/AppHead/AppHead'
import { GrowText } from '@/components/GrowText/GrowText'
import { sendRemindersNowAction } from './actions'
import { adminCopy } from '../copy'
import styles from '../admin.module.scss'

/**
 * Stjórnborð → Verkfæri: the invoicing export (CSV or XLSX, each download logged on every
 * entry in it) and "send reminders now". Both were on the old staff page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: adminCopy[locale].toolsTitle }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function AdminToolsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ year?: string; reminders?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  await requireAdmin({ locale, next: localePath(ADMIN.tools, locale) })
  const c = adminCopy[locale]
  const search = await searchParams
  const year = Number(one(search.year))
  const edition = await getStaffEdition(getAwardsDb(), Number.isInteger(year) ? year : undefined)
  if (!edition) notFound()

  // What "send reminders now" did: "<request reminders>.<draft reminders>.<failed>".
  const parts = (one(search.reminders) ?? '').split('.').map(Number)
  const remindersResult =
    parts.length === 3 && parts.every((n) => Number.isInteger(n) && n >= 0)
      ? (parts as [number, number, number])
      : null
  const exportHref = (format: 'csv' | 'xlsx') =>
    `/api/awards/staff/export?format=${format}&year=${edition.year}`

  return (
    <>
      <AppHead title={c.toolsTitle} eyebrow={c.eyebrow} lede={c.toolsLede} />
      <div className={styles.page}>
        <div className={styles.tools}>
          <section aria-labelledby="staff-export" className={styles.part}>
            <h2 id="staff-export" className={styles.heading}>
              {c.exportTitle}
            </h2>
            <p className={styles.text}>{c.exportLead}</p>
            <p className={styles.actions}>
              <a className={`btn-grow ${styles.secondary}`} href={exportHref('csv')} download>
                <GrowText>{c.exportCsv}</GrowText>
              </a>
              <a className={`btn-grow ${styles.secondary}`} href={exportHref('xlsx')} download>
                <GrowText>{c.exportXlsx}</GrowText>
              </a>
            </p>
            <p className={styles.note}>{c.exportCsvNote}</p>
          </section>

          <section aria-labelledby="staff-reminders" className={styles.part}>
            <h2 id="staff-reminders" className={styles.heading}>
              {c.remindersTitle}
            </h2>
            <p className={styles.text}>{c.remindersLead}</p>
            <form action={sendRemindersNowAction} className={styles.actions}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="year" value={edition.year} />
              <button type="submit" className={`btn-grow ${styles.secondary}`} data-testid="send-reminders">
                <GrowText>{c.remindersSend}</GrowText>
              </button>
            </form>
            {remindersResult && (
              <p role="status" className={styles.result} data-testid="reminders-result">
                {c.remindersResult(...remindersResult)}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
