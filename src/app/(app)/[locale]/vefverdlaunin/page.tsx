import { notFound } from 'next/navigation'
import { getDictionary, isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { getAwardsIntro, getCeremony, getWinnersArchive, listAwardCategories } from '@/lib/content/awards'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { RichText } from '@/components/RichText/RichText'
import { Section } from '@/components/Section/Section'
import { CategoryGrid } from '@/components/CategoryGrid/CategoryGrid'
import { CeremonyBlock } from './CeremonyBlock'
import { WinnersArchive, type ArchiveYear } from './WinnersArchive'
import styles from './awards.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR.
 *
 * `/vefverdlaunin` adds no dynamic segment of its own — the winners archive is
 * in-page tabs rather than a `/vefverdlaunin/[year]` route (see `WinnersArchive`
 * and svef/www#20) — so this route needs `revalidate` and nothing else. No
 * `generateStaticParams`: the only segment that varies is `[locale]`, and the
 * layout above already generates it. See the rendering section of `CLAUDE.md`.
 *
 * Five minutes is the site-wide figure. It suits this page particularly well:
 * the ceremony block is what changes in a hurry — a venue, a deadline, the day
 * tickets go on sale — and an editor who fixes one wants to see it fixed.
 */
export const revalidate = 300

export default async function AwardsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const [{ intro, introLocale }, categories, ceremony] = await Promise.all([
    getAwardsIntro(locale),
    listAwardCategories(locale),
    getCeremony(locale),
  ])
  const archive = await getWinnersArchive(locale, ceremony?.year ?? null)

  /**
   * The page-level note covers the bilingual half of the page: the lead, the
   * category names and the ceremony heading. The winners archive is deliberately
   * left out of it.
   *
   * This is the `/um-svef` case rather than the whole-page one, and the
   * distinction matters. `TranslationNote`'s `icelandic-by-design` variant says
   * "this page is published in Icelandic only", and this page is not: the header,
   * the lead, the thirteen categories and the ceremony block are all translated,
   * and only the archive below them is Icelandic by decision. A page-scoped note
   * would be false about four fifths of what the reader can see, and would tell
   * an English reader not to expect a translation of a page that already has one.
   * The archive carries an inline marker instead, exactly as the bylaws and the
   * press list do on `/um-svef`.
   */
  const contentLocale = resolveContentLocale(
    [introLocale, ...categories.map((c) => c.nameLocale), ...(ceremony?.headline ? [ceremony.headlineLocale] : [])],
    locale,
  )

  const langOf = (of: typeof locale) => (of === locale ? undefined : of)

  /**
   * "Íslenska eingöngu" beside the archive heading — on the English page only.
   *
   * Same reasoning as `/um-svef`: on the Icelandic page the marker has nothing
   * to say, because the reader is already reading the language it is about. The
   * export's own equivalent — "Íslenska eingöngu / Icelandic-only section",
   * written half in English in the same muted style as "FAQ accordion" beside
   * the About page's FAQ — is an annotation to the implementer, not copy, so it
   * is not transcribed.
   */
  const icelandicOnly =
    locale === DEFAULT_LOCALE ? null : (
      <p className={styles.icelandicOnly}>{t.awards.icelandicOnly}</p>
    )

  /** The two facts under the ceremony heading, minus any the board has not set. */
  const ceremonyLines = ceremony
    ? [
        ceremony.submissionDeadline &&
          t.awards.ceremony.submissions(formatLongDate(ceremony.submissionDeadline, locale)),
        ceremony.ticketsOnSaleFrom &&
          t.awards.ceremony.ticketsOnSale(formatLongDate(ceremony.ticketsOnSaleFrom, locale)),
      ].filter((line): line is string => Boolean(line))
    : []

  const archiveYears: ArchiveYear[] = archive.map((year) => ({
    year: year.year,
    winnersLabel: t.awards.archive.winnersLabel(year.year),
    emptyTitle: t.awards.archive.empty.title(year.year),
    winners: year.winners.map((winner) => ({
      id: winner.id,
      siteName: winner.siteName,
      category: winner.category,
      year: winner.year,
      blurb: winner.blurb,
      url: winner.url,
      screenshot: winner.screenshot,
      categoryLang: langOf(winner.categoryLocale),
      // `award-winners.blurb` has no English column — the archive is Icelandic
      // by decision — so on the English page it is always marked as Icelandic.
      blurbLang: langOf(DEFAULT_LOCALE),
    })),
  }))

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader
        eyebrow={ceremony ? t.awards.eyebrow(ceremony.year) : undefined}
        title={t.awards.title}
      />

      <Section className={styles.leadSection}>
        <RichText data={intro} className={styles.lead} lang={langOf(introLocale)} />
      </Section>

      {ceremony && (
        <CeremonyBlock
          eyebrow={t.awards.ceremony.eyebrow(ceremony.year)}
          headline={
            ceremony.headline ??
            t.awards.ceremony.headline(formatLongDate(ceremony.ceremonyDate, locale), ceremony.venue)
          }
          // A composed heading is built from this page's own date formatting and
          // the venue as recorded, so it is in the reader's language; only an
          // editor's written headline can have fallen back.
          headlineLang={ceremony.headline ? langOf(ceremony.headlineLocale) : undefined}
          lines={ceremonyLines}
          submit={
            ceremony.submissionUrl
              ? { label: t.awards.ceremony.submit, href: ceremony.submissionUrl }
              : null
          }
          tickets={
            ceremony.ticketUrl
              ? { label: t.awards.ceremony.buyTickets, href: ceremony.ticketUrl }
              : null
          }
        />
      )}

      <Section title={t.awards.categoriesTitle}>
        <CategoryGrid
          categories={categories.map((category) => ({
            name: category.name,
            lang: langOf(category.nameLocale),
          }))}
        />
      </Section>

      <Section>
        <div className={styles.archiveHead}>
          <h2 className={styles.archiveTitle}>{t.awards.archive.title}</h2>
          {icelandicOnly}
        </div>
        <WinnersArchive
          years={archiveYears}
          yearsLabel={t.awards.archive.yearsLabel}
          emptyBody={t.awards.archive.empty.body}
        />
      </Section>
    </>
  )
}
