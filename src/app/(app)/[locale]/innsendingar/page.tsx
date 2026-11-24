import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale, localePath } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { getPublicCatalog } from '@/lib/awards/public-catalog.server'
import { CEREMONY_DATE_2026, intakePhase, lastDayBefore } from '@/lib/awards/public-catalog'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { SubmissionCategories } from '@/components/SubmissionCategories/SubmissionCategories'
import { SubmissionCta } from '@/components/SubmissionCta/SubmissionCta'
import styles from './submissions.module.scss'

/**
 * Prerendered and revalidated, not `force-dynamic` (CLAUDE.md, "Rendering").
 *
 * The page reads the awards database (the source of truth, so a price edit shows),
 * and one thing on it depends on the clock: whether intake has opened. A minute is
 * the window, shorter than the other pages' five because this flip is the point of the
 * page on 1 December. Revalidation is lazy, so the request that crosses the boundary
 * can still be served the stale "opens 1 December" page and only triggers the rebuild;
 * the next one gets the open page. That is up to a minute plus one request, which is
 * the same staleness floor CLAUDE.md describes, and it is harmless in this direction:
 * the stale page makes no promise the sign-up pages do not keep, and a visitor who
 * reloads sees the button. `force-dynamic` would buy exactness at the price of a
 * function invocation and a database round trip on every visit, to move one button.
 * If it ever has to be exact, an on-demand `revalidatePath` fired at the opening
 * moment is the fix, not a dynamic route.
 */
export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: getDictionary(locale).submissions.title }
}

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const s = t.submissions

  const catalog = await getPublicCatalog()
  if (!catalog) throw new Error('The awards database has no edition to show.')
  const { edition, choices } = catalog

  // The server clock, read at render time (spec §2).
  const phase = intakePhase(edition, new Date())
  const date = (iso: string) => formatLongDate(iso, locale)

  const dates = [
    { key: 'opens', label: s.dates.opens, iso: edition.intakeOpensAt },
    { key: 'earlyBird', label: s.dates.earlyBird, iso: lastDayBefore(edition.earlyBirdEndsBefore) },
    { key: 'closes', label: s.dates.closes, iso: lastDayBefore(edition.intakeClosesBefore) },
    { key: 'ceremony', label: s.dates.ceremony, iso: CEREMONY_DATE_2026 },
  ]

  // Sign-up and sign-in come back to the dashboard (`next`), which is the landing page
  // after login (spec §6).
  const next = encodeURIComponent(localePath('/innsendingar/minar', locale))
  const actions = {
    startLabel: s.start,
    startHref: `${localePath('/nyskraning', locale)}?next=${next}`,
    hasAccount: s.hasAccount,
    signInLabel: s.signIn,
    signInHref: `${localePath('/innskraning', locale)}?next=${next}`,
  }

  const message =
    phase === 'before'
      ? s.ctaBefore(date(edition.intakeOpensAt))
      : phase === 'closed'
        ? s.ctaClosed(date(lastDayBefore(edition.intakeClosesBefore)))
        : s.ctaOpen

  return (
    <>
      <PageHead title={s.title} lede={s.lead(edition.year)} locale={locale} />

      <PageSection aria-labelledby="submissions-dates">
        <SectionHead id="submissions-dates" title={s.datesTitle} />
        <dl className={styles.dates}>
          {dates.map((d) => (
            <div key={d.key} className={styles.date} data-date={d.key}>
              <dt>{d.label}</dt>
              <dd>
                <time dateTime={d.iso.slice(0, 10)}>{date(d.iso)}</time>
              </dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection aria-labelledby="submissions-categories">
        <SectionHead id="submissions-categories" title={s.categoriesTitle} />
        <p className={styles.lead}>{s.categoriesLead(edition.earlyBirdDiscountPercent)}</p>
        <SubmissionCategories
          choices={choices}
          locale={locale}
          label={s.categoriesLabel}
          copy={{
            earlyBird: s.earlyBird,
            regular: s.regular,
            currency: s.currency,
            description: s.description,
            tiersTitle: s.tiersTitle,
            tiersNote: s.tiersNote,
          }}
        />
      </PageSection>

      <PageSection aria-labelledby="submissions-need">
        <SectionHead id="submissions-need" title={s.needTitle} />
        <ul className={styles.need}>
          {s.need.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection aria-labelledby="submissions-start" last>
        <SubmissionCta
          headingId="submissions-start"
          phase={phase}
          title={s.ctaTitle}
          message={message}
          actions={actions}
        />
      </PageSection>
    </>
  )
}
