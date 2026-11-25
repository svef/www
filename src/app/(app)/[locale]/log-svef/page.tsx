import { notFound } from 'next/navigation'
import { getDictionary, isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getBylaws, LAWS_REPO_URL } from '@/lib/bylaws'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { BylawsText } from '@/components/Bylaws/BylawsText'
import { BylawsNote } from '@/components/Bylaws/BylawsNote'
import { getSiteChrome } from '@/lib/content/site-settings'
import styles from './bylaws.module.scss'
import { cardMetadata } from '@/lib/og/metadata'

export const generateMetadata = cardMetadata('log-svef')

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
  const [bylaws, chrome] = await Promise.all([getBylaws(), getSiteChrome(locale)])
  const p = t.about.bylawsProcess

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
      <PageHead title={t.about.bylawsTitle} locale={locale} />

      <PageSection>
        {bylaws.status === 'ok' ? (
          <BylawsText markdown={bylaws.markdown} lang={DEFAULT_LOCALE} />
        ) : (
          <p className={styles.bylawsNotice} role="status">
            {t.about.bylawsUnavailable}{' '}
            <a href={LAWS_REPO_URL}>{LAWS_REPO_URL.replace('https://', '')}</a>
          </p>
        )}
      </PageSection>

      {/*
        How the bylaws are changed, after the bylaws themselves — a reader
        proposing an amendment has read them first.

        Outside the fetch's success branch on purpose: how to propose a
        change is true whether or not GitHub answered, and this is the one
        thing on the page still worth reading when the text is unavailable.

        Written in the reader's language, unlike the bylaws above. This is
        the association explaining its own process, not the legal text, and
        the Icelandic-only decision covers the latter.
      */}
      <BylawsNote heading={p.heading}>
        <p>
          {p.repoLead} <a href={LAWS_REPO_URL}>{LAWS_REPO_URL.replace('https://', '')}</a>
        </p>
        <p>
          {p.howTo} <a href={`mailto:${chrome.contactEmail}`}>{chrome.contactEmail}</a>{' '}
          {p.howToEnd}
        </p>
        <p>{p.meeting}</p>
        <p>{p.article8}</p>
      </BylawsNote>
      <div className={styles.end} />
    </>
  )
}
