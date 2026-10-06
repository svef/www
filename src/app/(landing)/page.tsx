import { LandingLogo } from '@/components/LandingLogo/LandingLogo'
import { BlockPanel } from '@/components/BlockPanel/BlockPanel'
import styles from './landing.module.scss'


// Builds a Google Calendar "add event" URL. Iceland keeps UTC all year, so the
// Z timestamps below are the local times exactly — no offset maths needed.
function googleCalendar(e: {
  title: string
  start: string
  end: string
  location: string
  summary: string
}) {
  // Built by hand rather than with URLSearchParams: that would percent-encode the
  // slash in `dates`, and Google's template expects a literal START/END separator.
  const p = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(e.title)}`,
    `dates=${e.start}/${e.end}`,
    `location=${encodeURIComponent(e.location)}`,
    `details=${encodeURIComponent(e.summary)}`,
  ]
  return `https://calendar.google.com/calendar/render?${p.join('&')}`
}

const events = [
  {
    date: '8. október',
    time: '17:00–20:00',
    title: 'Sigurvegarar segja frá – SVEF x Kolibri',
    badge: 'Ókeypis',
    venue: 'Skrifstofur Kolibri, Borgartún 26, 105 Reykjavík',
    directions:
      'https://www.google.com/maps/search/?api=1&query=Borgart%C3%BAn+26%2C+105+Reykjav%C3%ADk',
    body: 'SVEF og Kolibri blása til fyrsta viðburðar vetrarins. Við kynnumst verðlaunaverkefnum af Íslensku vefverðlaununum — sögunum á bak við þau og hvar þau standa í dag. Erindi 17–18:30, spjall og tengslamyndun eftirá. Léttar veitingar í boði.',
    speakers: [
      'Helena Rut og Gunnar Bjarki, stofnendur Undralings, segja okkur frá verkefninu sínu sem var valið app ársins, stafræn lausn ársins og verkefni ársins 2025!',
      'Frilli, hönnuður hjá Kolibri, segir okkur frá Okkar heimi, sem var valinn samfélagsvefur ársins 2025.',
      'Rakel Björt, framendaforritari hjá Helix Health, segir okkur frá Silva, sem hreppti verðlaunin fyrir tækninýtingu ársins 2025.',
    ],
    action: { label: 'Viðburður á Facebook', href: 'https://fb.me/e/4iObUsrLH' },
    ics: '/landing/haustopnun-svef.ics',
    gcal: googleCalendar({
      title: 'Sigurvegarar segja frá – SVEF x Kolibri',
      start: '20261008T170000Z',
      end: '20261008T200000Z',
      location: 'Skrifstofur Kolibri, Borgartún 26, 105 Reykjavík',
      summary: 'Verðlaunaverkefni Íslensku vefverðlaunanna 2025. Ókeypis inn.',
    }),
  },
  {
    date: '21. október',
    time: '11:50–14:00',
    title: 'Vefþróun og gervigreind: Hvað er framundan?',
    badge: null,
    venue: 'Harpa, Kaldalón (1. hæð)',
    directions: null,
    body: 'Vefþróun er á stöðugri hreyfingu og breytingarnar gerast hratt. Við fáum reynslubolta úr vefheiminum til að rýna í nýjustu stefnur og strauma og spá fyrir um hvað er framundan. Viðburðurinn er haldinn af Ský í samstarfi við Samtök vefiðnaðarins. Boðið er upp á veitingar.',
    speakers: [
      'Pablo Santos, Íslandsbanka',
      'Guðmundur Bjarni Sigurðsson og Jón Kári Eldon, Júní',
      'Ólafur Kjartansson, Hugsmiðjunni',
      'Steinar Ingi Farestveit, Kolibri',
      'Klara Arnalds, Avo',
      'Freyr Friðfinnsson, Samtökum iðnaðarins, stýrir umræðum',
    ],
    action: {
      label: 'Kaupa miða',
      href: 'https://www.sky.is/vidburdur/3165-2026-vidburdur-1021',
    },
    ics: '/landing/vefthroun-gervigreind.ics',
    gcal: googleCalendar({
      title: 'Vefþróun og gervigreind: Hvað er framundan?',
      start: '20261021T115000Z',
      end: '20261021T140000Z',
      location: 'Harpa, Kaldalón (1. hæð), Reykjavík',
      summary: 'Viðburður Ský í samstarfi við Samtök vefiðnaðarins.',
    }),
  },
]

const footerSocials = [
  { label: 'Facebook', icon: '/landing/ic-facebook.svg', href: 'https://www.facebook.com/vefidnadurinn' },
  { label: 'Instagram', icon: '/landing/ic-instagram.svg', href: 'https://www.instagram.com/_svef_/' },
  // m.me/<page username> opens a Messenger thread with the page.
  { label: 'Messenger', icon: '/landing/ic-messenger.svg', href: 'https://m.me/vefidnadurinn' },
  { label: 'LinkedIn', icon: '/landing/ic-linkedin.svg', href: 'https://www.linkedin.com/company/sveficeland/' },
]

export default function LandingPage() {
  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.logoHeading}>
          <LandingLogo />
        </h1>
      </section>

      <section className={styles.section}>
        <BlockPanel
          title="Um SVEF"
          mobileBand="/landing/about-mobile-purple.svg"
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
          samtakanna eru hin árlegu Íslensku vefverðlaun, auk fjölda smærri viðburða.
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
          title="Viðburðir"
          mobileBand="/landing/about-mobile-purple.svg"
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
          Starfsárið 2026–2027 er hafið. Hér fyrir neðan eru næstu viðburðir — nánari
          upplýsingar um dagskrá og staðsetningu verða birtar á samfélagsmiðlum og hér á
          vefnum.
        </BlockPanel>

        <ul className={styles.events}>
          {events.map((e) => (
            <li key={e.title} className={styles.event}>
              <div className={styles.eventTop}>
                <p className={styles.eventWhen}>
                  <span>{e.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{e.time}</span>
                </p>
                {e.badge ? <p className={styles.eventBadge}>{e.badge}</p> : null}
              </div>

              <h3 className={styles.eventTitle}>{e.title}</h3>

              <p className={styles.eventVenue}>
                {e.venue}
                {e.directions ? (
                  <>
                    {' '}
                    <a
                      className={styles.eventDirections}
                      href={e.directions}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Leiðarlýsing
                    </a>
                  </>
                ) : null}
              </p>

              <p className={styles.eventBody}>{e.body}</p>

              <ul className={styles.speakers}>
                {e.speakers.map((sp) => (
                  <li key={sp}>{sp}</li>
                ))}
              </ul>


              <div className={styles.eventActions}>
                <a
                  className={styles.eventPrimary}
                  href={e.action.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {e.action.label}
                </a>
                {/* A plain <details> rather than a scripted menu: the page ships no
                    client JS, and a disclosure is keyboard-operable for free. */}
                <details className={styles.calendar}>
                  <summary className={styles.calendarToggle}>Setja í dagatal</summary>
                  <div className={styles.calendarMenu}>
                    <a href={e.gcal} target="_blank" rel="noreferrer">
                      Google Calendar
                    </a>
                    <a href={e.ics} download>
                      Apple, Outlook (.ics)
                    </a>
                  </div>
                </details>
              </div>
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
          <p className={styles.copy}>© SVEF 2026</p>
        </div>
      </footer>
    </>
  )
}
