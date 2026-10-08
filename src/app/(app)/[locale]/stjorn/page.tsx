import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { listBoardMembers } from '@/lib/content/about'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { BoardCard, type Accent } from '@/components/BoardCard/BoardCard'
import styles from './board.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR.
 *
 * `/stjorn` adds no dynamic segment of its own — the only thing that varies is
 * `[locale]`, and the layout above already generates it — so this route needs
 * `revalidate` and nothing else. See the rendering section of `CLAUDE.md`.
 *
 * Split out of `/um-svef` by svef/www#103, so each of the three sections that
 * used to live there gets its own `TranslationNote` scoped to its own content
 * rather than one note covering all of them.
 */
export const revalidate = 300

/** Rotates across the grid, as in the design export. Positional, not per person. */
const ACCENTS: Accent[] = ['violet', 'pink', 'yellow', 'red']

export default async function BoardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const board = await listBoardMembers(locale)

  const contentLocale = resolveContentLocale(
    board.map((member) => member.roleLocale),
    locale,
  )

  const langOf = (of: typeof locale) => (of === locale ? undefined : of)

  /**
   * "hjá" / "at", joining a board role to the employer it belongs to.
   *
   * Taken from the role's own language rather than the page's: on `/en` a role
   * that fell back to Icelandic keeps an Icelandic connector, so the phrase reads
   * as one language instead of half-translated. It sits inside the same
   * `lang`-marked span as the role for the same reason.
   */
  const companyPrefix = (of: typeof locale) => getDictionary(of).about.boardCompanyPrefix

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={t.about.boardTitle} />

      <Section>
        <div className={styles.boardGrid}>
          {board.map((member, i) => (
            <BoardCard
              key={member.name}
              name={member.name}
              role={member.role}
              company={member.company}
              companyPrefix={companyPrefix(member.roleLocale)}
              portrait={member.portrait}
              roleLang={langOf(member.roleLocale)}
              accent={ACCENTS[i % ACCENTS.length]}
            />
          ))}
        </div>
      </Section>
    </>
  )
}
