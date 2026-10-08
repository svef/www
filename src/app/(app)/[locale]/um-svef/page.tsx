import { notFound } from 'next/navigation'
import { getDictionary, isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { formatFileSize } from '@/lib/filesize'
import { resolveContentLocale } from '@/lib/localized'
import { getAboutContent } from '@/lib/content/about'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { RichText } from '@/components/RichText/RichText'
import { Section } from '@/components/Section/Section'
import styles from './about.module.scss'

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
 * `TranslationNote` scoped to its own content. This page now covers only the
 * story, the press list and the brand assets.
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

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={t.about.title} />

      <Section>
        <RichText data={about.story} className={styles.story} lang={storyLang} />
      </Section>

      <Section>
        <div className={styles.stack}>
          <div>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t.about.pressTitle}</h2>
              {icelandicOnly}
            </div>
            {about.press.length === 0 ? (
              <p className={styles.asideEmpty}>{t.about.press.empty}</p>
            ) : (
              <ul className={styles.pressList} lang={DEFAULT_LOCALE}>
                {about.press.map((item) => (
                  <li key={`${item.outlet}:${item.title}`} className={styles.pressItem}>
                    {item.url ? (
                      <a className={styles.pressLink} href={item.url}>
                        <span className={styles.pressTitle}>{item.title}</span>
                        <span className={styles.pressOutlet}>{item.outlet}</span>
                      </a>
                    ) : (
                      // No link recorded for this mention — the row is still
                      // real coverage, so it is listed as plain text rather
                      // than as an anchor that goes nowhere.
                      <span className={styles.pressLink}>
                        <span className={styles.pressTitle}>{item.title}</span>
                        <span className={styles.pressOutlet}>{item.outlet}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.brandCard}>
            <h2 className={styles.brandTitle}>{t.about.brand.title}</h2>
            <p className={styles.brandBlurb}>{t.about.brand.blurb}</p>
            {about.brandAssets.length === 0 ? (
              // `brandAssets.file` is a required upload, so an empty list means
              // no files have been uploaded yet — not a rendering failure. The
              // card keeps its heading and says where to get the logo instead of
              // showing download buttons that download nothing.
              <p className={styles.asideEmpty}>{t.about.brand.empty}</p>
            ) : (
              <ul className={styles.brandDownloads}>
                {about.brandAssets.map((asset) => {
                  // `filesize` is what Payload recorded for the upload. It can
                  // be missing on a media document restored from a dump, and a
                  // button that claimed "0 B" would be worse than one that says
                  // nothing, so the size is dropped rather than guessed.
                  const size = formatFileSize(asset.filesize, locale)
                  return (
                    <li key={asset.url}>
                      <a className={styles.download} href={asset.url} download>
                        {asset.label}
                        {size && <span className={styles.downloadSize}>{size}</span>}
                        <span aria-hidden="true">↓</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </>
  )
}
