import { LogoBuild } from '@/components/LogoBuild/LogoBuild'
import { BlockPanel } from '@/components/BlockPanel/BlockPanel'
import { BoardMemberCard } from '@/components/BoardMemberCard/BoardMemberCard'
import styles from './landing.module.scss'

const board = [
  { name: 'Salena Raquel Kauffman', role: 'Formaður SVEF', photo: '/landing/board-salena.jpg' },
  { name: 'Sigurður Snær Eiríksson', role: 'Gjaldkeri SVEF & Vefstjóri', photo: '/landing/board-sigurdur.jpg' },
  { name: 'Sveinn Steinarsson', role: 'Ritari SVEF & Dómarakerfi', photo: '/landing/board-sveinn.jpg' },
  { name: 'Margrét Rúnarsdóttir', role: 'Markaðsmál og miðlun', photo: '/landing/board-margret.jpg' },
  { name: 'Kolfinna Pétursdóttir', role: 'Markaðsmál og miðlun', photo: '/landing/board-kolfinna.jpg' },
  { name: 'Brian Johannessen', role: 'Dómarakerfi', photo: '/landing/board-brian.jpg' },
  { name: 'Petra Dís Magnúsdóttir', role: 'Vef- og viðburðastjórn', photo: '/landing/board-petra.jpg' },
  { name: 'Jón Andri Óskarsson', role: 'Verkefnastjóri – Nýr vefur', photo: '/landing/board-jon.jpg' },
]

const heroSocials = [
  { label: 'Facebook', icon: '/landing/ui-facebook.svg', href: '#' },
  { label: 'Instagram', icon: '/landing/ui-instagram.svg', href: '#' },
  { label: 'LinkedIn', icon: '/landing/ui-linkedin.svg', href: '#' },
]

const footerSocials = [
  { label: 'Facebook', icon: '/landing/ic-facebook.svg', href: '#' },
  { label: 'Instagram', icon: '/landing/ic-instagram.svg', href: '#' },
  { label: 'Messenger', icon: '/landing/ic-messenger.svg', href: '#' },
  { label: 'LinkedIn', icon: '/landing/ic-linkedin.svg', href: '#' },
]

export default function LandingPage() {
  return (
    <>
      <section className={styles.hero}>
        <ul className={styles.heroSocials}>
          {heroSocials.map((s) => (
            <li key={s.label}>
              <a href={s.href} aria-label={s.label}>
                <img src={s.icon} alt="" width={20} height={20} />
              </a>
            </li>
          ))}
        </ul>
        <LogoBuild />
        <h1 className={styles.headline}>
          Framtíð SVEF er björt – komdu og vertu memm!
          <br />
          Stærsta partý ársins er handan við hornið…
        </h1>
      </section>

      <section className={styles.section}>
        <BlockPanel
          baseW={1104}
          baseH={848}
          purpleSrc="/landing/bg-about-purple.svg"
          purple={{ l: 0, t: 0, w: 1104, h: 520 }}
          whiteSrc="/landing/bg-about-white.svg"
          white={{ l: 77, t: 223, w: 1027, h: 625 }}
          text={{ l: 280, t: 383, w: 731 }}
          title="Um SVEF"
          titleSize={56}
        >
          SVEF eru fagsamtök þeirra er starfa að vefmálum á Íslandi. Samtökin hafa það að
          markmiði að miðla þekkingu og efla fagleg vinnubrögð í greininni, vera
          samræðuvettvangur félagsmanna og andlit stéttarinnar út á við. Á meðal verkefna
          samtakanna eru hin árlegu Íslensku vefverðlaun og IceWeb-ráðstefnan, auk fjölda
          smærri viðburða.
        </BlockPanel>
      </section>

      <section className={styles.boardSection}>
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
            <BoardMemberCard key={m.name} name={m.name} role={m.role} photo={m.photo} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <BlockPanel
          baseW={1200}
          baseH={847}
          purpleSrc="/landing/bg-event-purple.svg"
          purple={{ l: 0, t: 0, w: 1200, h: 471 }}
          whiteSrc="/landing/bg-event-white.svg"
          white={{ l: 125, t: 174, w: 1075, h: 673 }}
          text={{ l: 515, t: 318, w: 544 }}
          title="Fyrsti viðburður SVEF!"
          titleSize={48}
        >
          Stjórnin vinnur nú að mótun starfsársins 2025–2026, sem hefst formlega með viðburði
          í október. Nánari upplýsingar um dagskrá og staðsetningu verða birtar á
          samfélagsmiðlum og hér á vefnum á næstu vikum.
        </BlockPanel>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMain}>
            <img className={styles.footerLogo} src="/landing/logo.svg" alt="SVEF" width={86} height={56} />
            <p className={styles.footerBlurb}>
              Samtök vefiðnaðarins (SVEF) eru fagsamtök þeirra er starfa að vefmálum á Íslandi.
              Samtökin hafa það að markmiði að miðla þekkingu og efla fagleg vinnubrögð í
              greininni.
            </p>
            <div className={styles.footerContact}>
              <a className={styles.footerEmail} href="mailto:svef@svef.is">
                svef@svef.is
              </a>
              <ul className={styles.footerSocials}>
                {footerSocials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} aria-label={s.label}>
                      <img src={s.icon} alt="" width={24} height={24} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className={styles.copy}>© SVEF 2025</p>
        </div>
      </footer>
    </>
  )
}
