import { LogoBuild } from '@/components/LogoBuild/LogoBuild'
import { Panel } from '@/components/Panel/Panel'
import { BoardMemberCard, type Accent } from '@/components/BoardMemberCard/BoardMemberCard'
import { BlockMotif } from '@/components/BlockMotif/BlockMotif'
import { Footer } from '@/components/Footer/Footer'
import styles from './landing.module.scss'

const board: { name: string; role: string; accent: Accent }[] = [
  { name: 'Salena Raquel Kauffman', role: 'Formaður · UX/UI hönnuður hjá JúnÍ Digital', accent: 'violet' },
  { name: 'Sigurður Snær Eiríksson', role: 'Gjaldkeri & vefstjóri · forritari hjá Dacoda', accent: 'yellow' },
  { name: 'Sveinn Steinarsson', role: 'Ritari · vefþróun', accent: 'red' },
  { name: 'Margrét Rúnarsdóttir', role: 'Meðstjórnandi · markaðsmál', accent: 'pink' },
  { name: 'Kolfinna Pétursdóttir', role: 'Meðstjórnandi · viðburðir', accent: 'violet' },
  { name: 'Brian Johannessen', role: 'Meðstjórnandi · dómkerfi', accent: 'yellow' },
  { name: 'Petra Dís Magnúsdóttir', role: 'Meðstjórnandi · stafrænar lausnir', accent: 'red' },
  { name: 'Jón Andri Óskarsson', role: 'Meðstjórnandi · nýr vefur', accent: 'pink' },
]

const socials = [
  { label: 'FB', href: '#' },
  { label: 'IG', href: '#' },
  { label: 'X', href: '#' },
  { label: 'LI', href: '#' },
]

export default function LandingPage() {
  return (
    <>
      <header className={styles.topbar}>
        <ul className={styles.topSocials}>
          {socials.slice(0, 3).map((s) => (
            <li key={s.label}>
              <a href={s.href} aria-label={s.label}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </header>

      <section className={styles.hero}>
        <BlockMotif className={styles.heroMotifLeft} tone="mixed" />
        <BlockMotif className={styles.heroMotifRight} />
        <LogoBuild />
        <h1 className={styles.headline}>
          Framtíð SVEF er björt – komdu og vertu memm! Stærsta partý ársins er handan við
          hornið…
        </h1>
      </section>

      <section className={styles.section}>
        <Panel title="Um SVEF">
          SVEF eru fagsamtök þeirra er starfa að vefmálum á Íslandi. Samtökin hafa það að
          markmiði að miðla þekkingu og efla fagleg vinnubrögð í greininni, vera
          samræðuvettvangur félagsmanna og andlit stéttarinnar út á við. Á meðal verkefna
          samtakanna eru hin árlegu Íslensku vefverðlaun og IceWeb-ráðstefnan, auk fjölda
          smærri viðburða.
        </Panel>
      </section>

      <section className={styles.section}>
        <div className={styles.boardHead}>
          <h2 className={styles.boardTitle}>Ný stjórn er tekin við</h2>
          <p className={styles.boardIntro}>
            Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 22. maí síðastliðinn.
            Stjórnin samanstendur af kempum og nýliðum í faginu sem eiga það sameiginlegt að
            brenna fyrir vefmálum. Við hlökkum mikið til starfsársins með ykkur og getum ekki
            beðið eftir að halda vefverðlaunin í 25. sinn!
          </p>
        </div>
        <div className={styles.boardGrid}>
          {board.map((m) => (
            <BoardMemberCard key={m.name} name={m.name} role={m.role} accent={m.accent} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Panel title="Fyrsti viðburður SVEF!">
          Stjórnin vinnur nú að mótun starfsársins 2025–2026, sem hefst formlega með viðburði
          í október. Nánari upplýsingar um dagskrá og staðsetningu verða birtar á
          samfélagsmiðlum og hér á vefnum á næstu vikum.
        </Panel>
      </section>

      <Footer
        blurb="Samtök vefiðnaðarins (SVEF) eru fagsamtök þeirra er starfa að vefmálum á Íslandi. Samtökin hafa það að markmiði að miðla þekkingu og efla fagleg vinnubrögð í greininni."
        email="svef@svef.is"
        socials={socials}
        year={2025}
      />
    </>
  )
}
