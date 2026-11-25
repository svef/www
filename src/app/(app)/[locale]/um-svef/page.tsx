import { notFound } from 'next/navigation'
import { getDictionary, isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { formatFileSize } from '@/lib/filesize'
import { formatMonthYear } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { getAboutContent } from '@/lib/content/about'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { RichText } from '@/components/RichText/RichText'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { StatsRow } from '@/components/StatsRow/StatsRow'
import { PressList } from '@/components/PressList/PressList'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { BrandKit } from '@/components/BrandKit/BrandKit'
import styles from './about.module.scss'
import { cardMetadata } from '@/lib/og/metadata'

export const generateMetadata = cardMetadata('um-svef')

/**
 * Statically prerendered for both locales and refreshed by ISR.
 *
 * `/um-svef` adds no dynamic segment of its own — the only thing that varies is
 * `[locale]`, and the layout above already generates it — so this route needs
 * `revalidate` and nothing else. See the rendering section of `CLAUDE.md`.
 *
 * Five minutes is the site-wide figure: long enough that the page is a cached
 * file in practice, short enough that an editor who changes the story or the
 * press list sees it while still looking.
 *
 * The board, the FAQ and the bylaws used to live here too. svef/www#103 split
 * them out to `/stjorn`, `/spurt-og-svarad` and `/log-svef`, each with its own
 * `TranslationNote` scoped to its own content. This page covers the story, the
 * press list and the brand kit.
 */
export const revalidate = 300

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const about = await getAboutContent(locale)

  /**
   * The page-level note covers the story only — the one bilingual piece of
   * content left on this page now that the board and FAQ have their own
   * routes (svef/www#103). The press list is Icelandic by editorial decision,
   * not by omission, so folding it in here would tell an English reader that a
   * translation is coming when none ever is. It carries its own "Icelandic
   * only" marker instead.
   */
  const contentLocale = resolveContentLocale([about.storyLocale], locale)

  const storyLang = about.storyLocale === locale ? undefined : about.storyLocale

  /**
   * The inline "Icelandic only" marker beside the press list — on the English
   * page only.
   *
   * There it tells an English reader why that section is not in their
   * language. On the Icelandic page it has nothing to say: the section is
   * already in the reader's language, so the marker states the obvious at best
   * and reads as "this section is restricted" at worst.
   */
  const icelandicOnly =
    locale === DEFAULT_LOCALE ? null : (
      <p className={styles.icelandicOnly}>{t.about.icelandicOnly}</p>
    )

  // Files an editor uploaded to the About page. The static logo downloads in the brand kit
  // do not depend on them, so an empty list is no longer an empty section.
  const brandFiles = about.brandAssets.map((asset) => ({
    label: asset.label,
    url: asset.url,
    size: formatFileSize(asset.filesize, locale),
  }))

  // Press is Icelandic, but its dates follow the page: the month name is chrome, not copy.
  const pressItems = about.press.map((item) => {
    const label = formatMonthYear(item.date, locale)
    return { ...item, date: label && item.date ? { iso: item.date, label } : null }
  })

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHead title={t.about.title} stickers="um-svef" locale={locale} />

      <PageSection>
        <RichText data={about.story} className={styles.story} lang={storyLang} />
      </PageSection>

      {/* The CMS figures, or the export's own when nobody has entered any. */}
      <PageSection>
        <StatsRow
          items={
            about.stats.length > 0
              ? about.stats.map((stat) => ({
                  value: stat.value,
                  label: stat.label,
                  labelLang: stat.labelLocale === locale ? undefined : stat.labelLocale,
                }))
              : t.about.stats
          }
        />
      </PageSection>

      <PageSection aria-labelledby="h-press">
        <SectionHead id="h-press" title={t.about.pressTitle}>
          {icelandicOnly}
        </SectionHead>
        {about.press.length === 0 ? (
          <EmptyState
            title={t.about.press.empty.title}
            body={t.about.press.empty.body}
            headingLevel={3}
          />
        ) : (
          <PressList
            items={pressItems}
            lang={DEFAULT_LOCALE}
            dateLang={locale === DEFAULT_LOCALE ? undefined : locale}
          />
        )}
      </PageSection>

      <BrandKit copy={t.about.brand} files={brandFiles} />
      <div className={styles.end} />
    </>
  )
}
