import { LogoBuild } from '@/components/LogoBuild/LogoBuild'
import { BlockPanel } from '@/components/BlockPanel/BlockPanel'
import styles from './landing.module.scss'


// Upcoming events shown under the event panel. Placeholder copy — the board
// supplies the real titles, descriptions and venues.
const events = [
  {
    date: '8. október',
    title: 'Haustopnun SVEF',
    body: 'Við hefjum starfsárið saman með léttum veitingum og spjalli. Kynnum dagskrá vetrarins og það sem framundan er hjá samtökunum.',
  },
  {
    date: '21. október',
    title: 'Vefkvöld: Aðgengi í verki',
    body: 'Stutt erindi frá fólki úr greininni um hvernig aðgengi er unnið í raunverulegum verkefnum — og hvað við getum gert betur.',
  },
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
        <LogoBuild />
        <h1 className={styles.headline}>
          Framtíð SVEF er björt – komdu og vertu memm!
          <br />
          Stærsta partý ársins er handan við hornið…
        </h1>
      </section>

      <section className={styles.section}>
        <BlockPanel
          title="Um SVEF"
          mobileBand="/landing/event-mobile-purple.svg"
          desktop={{
            baseW: 1104,
            baseH: 848,
            shapes: [
              { src: '/landing/bg-about-purple.svg', l: 0, t: 0, w: 1104, h: 520 },
              { src: '/landing/bg-about-white.svg', l: 77, t: 223, w: 1027, h: 625 },
            ],
            text: { l: 280, t: 383, w: 731 },
            titleSize: 56,
            bodyIndent: 93,
          }}
        >
          SVEF eru fagsamtök þeirra er starfa að vefmálum á Íslandi. Samtökin hafa það að
          markmiði að miðla þekkingu og efla fagleg vinnubrögð í greininni, vera
          samræðuvettvangur félagsmanna og andlit stéttarinnar út á við. Á meðal verkefna
          samtakanna eru hin árlegu Íslensku vefverðlaun og IceWeb-ráðstefnan, auk fjölda
          smærri viðburða.
        </BlockPanel>
      </section>

      <section className={styles.boardSection}>
        <h2 className={styles.boardTitle}>Stjórn SVEF</h2>
        <figure className={styles.boardFigure}>
          <div className={styles.boardFrame}>
            <img
              className={styles.boardPhoto}
              src="/landing/board-group.jpg"
              srcSet="/landing/board-group.jpg 1104w, /landing/board-group@2x.jpg 2208w"
              sizes="(max-width: 1168px) calc(100vw - 48px), 1104px"
              alt="Stjórn SVEF saman á hópmynd."
              width={1104}
              height={598}
            />
            {/* Violet rule tracing the same staircase the photo is clipped to.
                preserveAspectRatio="none" so it stretches with the figure, and a
                non-scaling stroke so the line stays an even weight at any width. */}
            <svg
              className={styles.boardOutline}
              viewBox="0 0 1104 598"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 0H562V60H1104V598H443V445H152V374H0Z" />
            </svg>
          </div>
          <figcaption className={styles.boardCaption}>
            Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 26. maí síðastliðinn.
            Stjórnin samanstendur af fólki með ólíkan bakgrunn og reynslu sem á það
            sameiginlegt að brenna fyrir vefmálum.
          </figcaption>
        </figure>
      </section>

      <section className={styles.section}>
        <BlockPanel
          title="Fyrsti viðburður SVEF!"
          mobileBand="/landing/event-mobile-purple.svg"
          desktop={{
            baseW: 1200,
            baseH: 847,
            shapes: [
              { src: '/landing/bg-event-purple.svg', l: 0, t: 0, w: 1200, h: 471 },
              { src: '/landing/bg-event-white.svg', l: 125, t: 174, w: 1075, h: 673 },
            ],
            text: { l: 515, t: 318, w: 544 },
            titleSize: 48,
            bodyIndent: 93,
          }}
        >
          Stjórnin vinnur nú að mótun starfsársins 2025–2026, sem hefst formlega með viðburði
          í október. Nánari upplýsingar um dagskrá og staðsetningu verða birtar á
          samfélagsmiðlum og hér á vefnum á næstu vikum.
        </BlockPanel>

        <ul className={styles.events}>
          {events.map((e) => (
            <li key={e.title} className={styles.event}>
              <p className={styles.eventDate}>{e.date}</p>
              <h3 className={styles.eventTitle}>{e.title}</h3>
              <p className={styles.eventBody}>{e.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMain}>
            <div className={styles.footerLeft}>
              <img
                className={styles.footerLogo}
                src="/landing/logo.svg"
                alt="SVEF"
                width={86}
                height={56}
              />
              <p className={styles.footerBlurb}>
                Samtök vefiðnaðarins (SVEF) eru fagsamtök þeirra er starfa að vefmálum á
                Íslandi. Samtökin hafa það að markmiði að miðla þekkingu og efla fagleg
                vinnubrögð í greininni.
              </p>
            </div>
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
