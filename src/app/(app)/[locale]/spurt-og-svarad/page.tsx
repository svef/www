import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { getAboutContent } from '@/lib/content/about'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { FaqAccordion } from '@/components/FaqAccordion/FaqAccordion'

/**
 * Statically prerendered for both locales and refreshed by ISR.
 *
 * `/spurt-og-svarad` adds no dynamic segment of its own — the only thing that
 * varies is `[locale]`, and the layout above already generates it — so this
 * route needs `revalidate` and nothing else. See the rendering section of
 * `CLAUDE.md`.
 *
 * Split out of `/um-svef` by svef/www#103, so each of the three sections that
 * used to live there gets its own `TranslationNote` scoped to its own content
 * rather than one note covering all of them.
 */
export const revalidate = 300

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const about = await getAboutContent(locale)

  const contentLocale = resolveContentLocale(
    about.faq.flatMap((item) => [item.questionLocale, item.answerLocale]),
    locale,
  )

  const langOf = (of: typeof locale) => (of === locale ? undefined : of)

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={t.about.faqTitle} />

      <Section>
        {about.faq.length === 0 ? (
          // A heading over an empty accordion reads as a rendering failure —
          // svef/www#76 — so this says the questions are coming rather than
          // leaving the page header with nothing under it.
          <EmptyState title={t.about.faqEmpty.title} body={t.about.faqEmpty.body} />
        ) : (
          <FaqAccordion
            items={about.faq.map((item) => ({
              question: item.question,
              answer: item.answer,
              questionLang: langOf(item.questionLocale),
              answerLang: langOf(item.answerLocale),
            }))}
          />
        )}
      </Section>
    </>
  )
}
