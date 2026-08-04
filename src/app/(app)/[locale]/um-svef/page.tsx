import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isLocale, type Locale } from '@/lib/i18n'
import { getBylawsMarkdown } from '@/lib/bylaws'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { BoardCard, type Accent } from '@/components/BoardCard/BoardCard'
import { FaqAccordion } from '@/components/FaqAccordion/FaqAccordion'
import styles from './about.module.scss'

const accents: Accent[] = ['violet', 'pink', 'yellow', 'red']

const content: Record<
  Locale,
  {
    title: string
    story: string[]
    boardTitle: string
    board: { name: string; role: string }[]
    bylawsTitle: string
    bylawsFallback: string
    faqTitle: string
    faq: { question: string; answer: string }[]
  }
> = {
  is: {
    title: 'Um SVEF',
    story: [
      'SVEF — Samtök vefiðnaðarins — voru stofnuð árið 2005 og eru félag fólks sem starfar við vefinn á Íslandi. Í dag eru félagar um 300 talsins: forritarar, hönnuðir, markaðsfólk, verkefnastjórar og UX-fólk.',
      'Við miðlum þekkingu og eflum fagleg vinnubrögð í greininni — með viðburðum, Íslensku vefverðlaununum og samtali milli fólks sem annars myndi aldrei hittast. Samtökin eru rekin af sex manna sjálfboðaliðastjórn.',
    ],
    boardTitle: 'Stjórn SVEF',
    board: [
      { name: 'Salena Raquel Kauffman', role: 'Formaður · UX/UI hönnuður hjá JúnÍ Digital' },
      { name: 'Sigurður Snær Eiríksson', role: 'Gjaldkeri & vefstjóri · forritari hjá Dacoda' },
      { name: 'Sveinn Steinarsson', role: 'Ritari · vefþróun' },
      { name: 'Margrét Rúnarsdóttir', role: 'Meðstjórnandi · markaðsmál' },
      { name: 'Kolfinna Pétursdóttir', role: 'Meðstjórnandi · viðburðir' },
      { name: 'Brian Johannessen', role: 'Meðstjórnandi · dómkerfi' },
      { name: 'Petra Dís Magnúsdóttir', role: 'Meðstjórnandi · stafrænar lausnir' },
      { name: 'Jón Andri Óskarsson', role: 'Meðstjórnandi · vefverkefni' },
    ],
    bylawsTitle: 'Lög SVEF',
    bylawsFallback:
      'Lög SVEF eru geymd á GitHub og birtast hér sjálfkrafa. (Ekki tókst að sækja þau í augnablikinu.)',
    faqTitle: 'Spurt og svarað',
    faq: [
      { question: 'Hvernig skrái ég mig í SVEF?', answer: 'Þú getur skráð þig hér á vefnum undir Skráning.' },
      { question: 'Hvað kostar að vera í SVEF?', answer: 'Einstaklingsaðild kostar 23.900 kr. og fyrirtækjaaðild 149.000 kr.' },
      { question: 'Hvað fæ ég út úr því að vera í SVEF?', answer: 'Frítt á alla viðburði (nema vefverðlaunin) og 20% afslátt af miðum á Íslensku vefverðlaunin.' },
      { question: 'Er einhver að vinna hjá SVEF?', answer: 'Nei — stjórn SVEF skipa sex sjálfboðaliðar, kjörnir til tveggja ára.' },
    ],
  },
  en: {
    title: 'About SVEF',
    story: [
      'SVEF — the Icelandic Web Industry Association — was founded in 2005 and is an association of people who work with the web in Iceland. Today it has around 300 members: developers, designers, marketers, project managers and UX folk.',
      'We share knowledge and raise professional standards in the field — through events, the Icelandic Web Awards, and conversations between people who would otherwise never meet. The association is run by a six-person volunteer board.',
    ],
    boardTitle: 'The board',
    board: [
      { name: 'Salena Raquel Kauffman', role: 'Chair · UX/UI designer at JúnÍ Digital' },
      { name: 'Sigurður Snær Eiríksson', role: 'Treasurer & web director · developer at Dacoda' },
      { name: 'Sveinn Steinarsson', role: 'Secretary · web development' },
      { name: 'Margrét Rúnarsdóttir', role: 'Board member · marketing' },
      { name: 'Kolfinna Pétursdóttir', role: 'Board member · events' },
      { name: 'Brian Johannessen', role: 'Board member · judging system' },
      { name: 'Petra Dís Magnúsdóttir', role: 'Board member · digital solutions' },
      { name: 'Jón Andri Óskarsson', role: 'Board member · web projects' },
    ],
    bylawsTitle: 'Bylaws',
    bylawsFallback:
      "SVEF's bylaws live on GitHub and render here automatically. (Could not fetch them right now.)",
    faqTitle: 'FAQ',
    faq: [
      { question: 'How do I join SVEF?', answer: 'You can sign up here on the site under Membership.' },
      { question: 'What does membership cost?', answer: 'Individual membership is 23,900 ISK and company membership 149,000 ISK.' },
      { question: 'What do I get from being a member?', answer: 'Free entry to all events (except the Web Awards) and 20% off Web Awards tickets.' },
      { question: 'Does anyone work for SVEF?', answer: 'No — the board is six volunteers, elected for two-year terms.' },
    ],
  },
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const c = content[locale]
  const bylaws = await getBylawsMarkdown()

  return (
    <>
      <PageHeader title={c.title} />
      <Section>
        <div className={styles.story}>
          {c.story.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title={c.boardTitle}>
        <div className={styles.boardGrid}>
          {c.board.map((m, i) => (
            <BoardCard key={m.name} name={m.name} role={m.role} accent={accents[i % accents.length]} />
          ))}
        </div>
      </Section>

      <Section title={c.bylawsTitle}>
        {bylaws ? (
          <div className={styles.bylaws}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{bylaws}</ReactMarkdown>
          </div>
        ) : (
          <p style={{ color: 'var(--fg-muted)' }}>{c.bylawsFallback}</p>
        )}
      </Section>

      <Section title={c.faqTitle}>
        <FaqAccordion items={c.faq} />
      </Section>
    </>
  )
}
