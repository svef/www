import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getBylaws, LAWS_REPO_URL } from '@/lib/bylaws'
import { remarkHeadingLevels } from '@/lib/remark-heading-levels'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import styles from './bylaws.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR.
 *
 * `/log-svef` adds no dynamic segment of its own — the only thing that varies
 * is `[locale]`, and the layout above already generates it — so this route
 * needs `revalidate` and nothing else. The bylaws themselves are not part of
 * that five-minute budget: they come from another repo over HTTP and carry
 * their own `revalidate: 3600` on the fetch (`src/lib/bylaws.ts`), so a
 * rebuild of this page reuses the cached Markdown rather than hitting GitHub
 * every five minutes. See the rendering section of `CLAUDE.md`.
 *
 * Split out of `/um-svef` by svef/www#103.
 */
export const revalidate = 300

export default async function BylawsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const bylaws = await getBylaws()

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  //
  // Unlike `/stjorn` and `/spurt-og-svarad`, nothing on this page varies by
  // content locale — the bylaws are Icelandic-only by editorial decision, in
  // full, not partially translated — so `contentLocale` is fixed at
  // `DEFAULT_LOCALE` and the note uses the `icelandic-by-design` wording
  // rather than "not translated yet". There is nothing here for an English
  // reader to wait for.
  return (
    <>
      <TranslationNote
        pageLocale={locale}
        contentLocale={DEFAULT_LOCALE}
        reason="icelandic-by-design"
      />
      <PageHeader title={t.about.bylawsTitle} />

      <Section>
        {bylaws.status === 'ok' ? (
          <div className={styles.bylaws} lang={DEFAULT_LOCALE}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, [remarkHeadingLevels, { startLevel: 2 }]]}
            >
              {bylaws.markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <p className={styles.bylawsNotice} role="status">
            {t.about.bylawsUnavailable}{' '}
            <a href={LAWS_REPO_URL}>{LAWS_REPO_URL.replace('https://', '')}</a>
          </p>
        )}
      </Section>
    </>
  )
}
