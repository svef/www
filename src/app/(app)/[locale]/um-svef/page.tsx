import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getDictionary, isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getBylaws, LAWS_REPO_URL } from '@/lib/bylaws'
import { remarkHeadingLevels } from '@/lib/remark-heading-levels'
import { resolveContentLocale } from '@/lib/localized'
import { getAboutContent, listBoardMembers } from '@/lib/content/about'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { RichText } from '@/components/RichText/RichText'
import { Section } from '@/components/Section/Section'
import { BoardCard, type Accent } from '@/components/BoardCard/BoardCard'
import { FaqAccordion } from '@/components/FaqAccordion/FaqAccordion'
import styles from './about.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR.
 *
 * `/um-svef` adds no dynamic segment of its own — the only thing that varies is
 * `[locale]`, and the layout above already generates it — so this route needs
 * `revalidate` and nothing else. See the rendering section of `CLAUDE.md`.
 *
 * Five minutes is the site-wide figure: long enough that the page is a cached
 * file in practice, short enough that an editor who changes a board role or adds
 * an FAQ row sees it while still looking at the site. The bylaws are not part of
 * that budget — they come from another repo over HTTP and carry their own
 * `revalidate: 3600` on the fetch (`src/lib/bylaws.ts`), so a rebuild of this
 * page reuses the cached Markdown rather than hitting GitHub every five minutes.
 */
export const revalidate = 300

/** Rotates across the grid, as in the design export. Positional, not per person. */
const ACCENTS: Accent[] = ['violet', 'pink', 'yellow', 'red']

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const [about, board, bylaws] = await Promise.all([
    getAboutContent(locale),
    listBoardMembers(locale),
    getBylaws(),
  ])

  /**
   * The page-level note covers the bilingual content only: the story, the board
   * roles and the FAQ. The press list and the bylaws are Icelandic by editorial
   * decision, not by omission, so folding them in here would tell an English
   * reader that a translation is coming when none ever is. They carry their own
   * "Icelandic only" marker instead.
   */
  const contentLocale = resolveContentLocale(
    [
      about.storyLocale,
      ...about.faq.flatMap((item) => [item.questionLocale, item.answerLocale]),
      ...board.map((member) => member.roleLocale),
    ],
    locale,
  )

  const storyLang = about.storyLocale === locale ? undefined : about.storyLocale
  const langOf = (of: typeof locale) => (of === locale ? undefined : of)

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={t.about.title} />

      <Section>
        <RichText data={about.story} className={styles.story} lang={storyLang} />
      </Section>

      <Section title={t.about.boardTitle}>
        <div className={styles.boardGrid}>
          {board.map((member, i) => (
            <BoardCard
              key={member.name}
              name={member.name}
              role={member.role}
              portrait={member.portrait}
              roleLang={langOf(member.roleLocale)}
              accent={ACCENTS[i % ACCENTS.length]}
            />
          ))}
        </div>
      </Section>

      <Section title={t.about.faqTitle}>
        <FaqAccordion
          items={about.faq.map((item) => ({
            question: item.question,
            answer: item.answer,
            questionLang: langOf(item.questionLocale),
            answerLang: langOf(item.answerLocale),
          }))}
        />
      </Section>

      {/*
        The export's last band is two columns: the bylaws on the left, press and
        the brand-asset card stacked on the right. It is one `<Section>` with
        three `<h2>`s rather than three sections, so the columns line up at the
        top the way the design draws them.
      */}
      <Section>
        <div className={styles.colophon}>
          <div className={styles.bylawsColumn}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t.about.bylawsTitle}</h2>
              <p className={styles.icelandicOnly}>{t.about.icelandicOnly}</p>
            </div>
            {bylaws.status === 'ok' ? (
              <div className={styles.bylaws} lang={DEFAULT_LOCALE}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkHeadingLevels]}>
                  {bylaws.markdown}
                </ReactMarkdown>
              </div>
            ) : (
              <p className={styles.bylawsNotice} role="status">
                {t.about.bylawsUnavailable}{' '}
                <a href={LAWS_REPO_URL}>{LAWS_REPO_URL.replace('https://', '')}</a>
              </p>
            )}
          </div>

          <div className={styles.aside}>
            <div>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t.about.pressTitle}</h2>
                <p className={styles.icelandicOnly}>{t.about.icelandicOnly}</p>
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
                  {about.brandAssets.map((asset) => (
                    <li key={asset.url}>
                      <a className={styles.download} href={asset.url} download>
                        {asset.label} <span aria-hidden="true">↓</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
