import { GrowText } from '@/components/GrowText/GrowText'
import type { Locale } from '@/lib/i18n'
import { pageWindow } from '@/lib/portal/paging'
import styles from './admin.module.scss'

const copy = {
  is: {
    label: 'Blaðsíður',
    prev: 'Fyrri',
    next: 'Næsta',
    page: (n: number) => `Síða ${n}`,
    pageOf: (page: number, count: number) => `Síða ${page} af ${count}`,
  },
  en: {
    label: 'Pages',
    prev: 'Previous',
    next: 'Next',
    page: (n: number) => `Page ${n}`,
    pageOf: (page: number, count: number) => `Page ${page} of ${count}`,
  },
} satisfies Record<Locale, unknown>

/**
 * Paging for the admin's long lists: previous and next, and the pages around the current one
 * with the first and last, as plain links (each page is a URL). Nothing when there is one page.
 */
export function Pager({
  locale,
  page,
  pageCount,
  href,
}: {
  locale: Locale
  page: number
  pageCount: number
  href: (page: number) => string
}) {
  if (pageCount <= 1) return null
  const c = copy[locale]
  return (
    <nav className={styles.pager} aria-label={c.label} data-pager>
      {page > 1 && (
        <a className={`btn-grow ${styles.secondarySmall}`} href={href(page - 1)} rel="prev">
          <GrowText>{c.prev}</GrowText>
        </a>
      )}
      <ol className={styles.pages}>
        {pageWindow(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className={styles.gap}>
              …
            </li>
          ) : (
            <li key={n}>
              <a
                className={styles.pageLink}
                href={href(n)}
                aria-current={n === page ? 'page' : undefined}
                aria-label={n === page ? c.pageOf(n, pageCount) : c.page(n)}
              >
                {n}
              </a>
            </li>
          ),
        )}
      </ol>
      {page < pageCount && (
        <a className={`btn-grow ${styles.secondarySmall}`} href={href(page + 1)} rel="next">
          <GrowText>{c.next}</GrowText>
        </a>
      )}
    </nav>
  )
}
