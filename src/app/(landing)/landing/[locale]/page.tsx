import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LandingLogo } from '@/components/LandingLogo/LandingLogo'
import { BlockPanel } from '@/components/BlockPanel/BlockPanel'
import { LanguageToggle } from '@/components/LanguageToggle/LanguageToggle'
import { LOCALES, isLocale } from '@/lib/i18n'
import { getLandingCopy } from '../../content'
import styles from '../../landing.module.scss'

// Both locales are known at build time and nothing else is a locale.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}
export const dynamicParams = false

const footerSocials = [
  { label: 'Facebook', icon: '/landing/ic-facebook.svg', href: 'https://www.facebook.com/vefidnadurinn' },
  { label: 'Instagram', icon: '/landing/ic-instagram.svg', href: 'https://www.instagram.com/_svef_/' },
  // m.me/<page username> opens a Messenger thread with the page.
  { label: 'Messenger', icon: '/landing/ic-messenger.svg', href: 'https://m.me/vefidnadurinn' },
  { label: 'LinkedIn', icon: '/landing/ic-linkedin.svg', href: 'https://www.linkedin.com/company/sveficeland/' },
]

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const copy = getLandingCopy(locale)

  return (
    <>
      <header className={styles.topBar}>
        <LanguageToggle
          locale={locale}
          label={copy.language.label}
          names={{ is: copy.language.is, en: copy.language.en }}
        />
      </header>

      <section className={styles.hero}>
        <h1 className={styles.logoHeading}>
          <LandingLogo label={copy.logoLabel} />
        </h1>
      </section>

      <section className={styles.section}>
        <BlockPanel
          title={copy.about.title}
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
          {copy.about.body}
        </BlockPanel>
      </section>

      <section className={styles.boardSection}>
        <h2 className={styles.boardTitle}>{copy.board.title}</h2>
        <figure className={styles.boardFigure}>
          <div className={styles.boardFrame}>
            <img
              className={styles.boardPhoto}
              src="/landing/board-group.jpg"
              srcSet="/landing/board-group.jpg 1104w, /landing/board-group@2x.jpg 2208w"
              sizes="(max-width: 1168px) calc(100vw - 48px), 1104px"
              alt={copy.board.alt}
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
          <figcaption className={styles.boardCaption}>{copy.board.caption}</figcaption>
        </figure>
      </section>

      <section className={styles.section}>
        <BlockPanel
          title={copy.events.title}
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
          {copy.events.body}
        </BlockPanel>

        <ul className={styles.events}>
          {copy.events.items.map((e) => (
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
                      {copy.labels.directions}
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
                  <summary className={styles.calendarToggle}>
                    {copy.labels.addToCalendar}
                  </summary>
                  <div className={styles.calendarMenu}>
                    <a href={e.gcal} target="_blank" rel="noreferrer">
                      {copy.labels.googleCalendar}
                    </a>
                    <a href={e.ics} download>
                      {copy.labels.icsDownload}
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
              <p className={styles.footerBlurb}>{copy.footer.blurb}</p>
            </div>
            <div className={styles.footerWrite}>
              <h2 className={styles.footerWriteHeading}>{copy.write.heading}</h2>
              <Link className={styles.footerWriteLink} href={copy.write.feedbackHref}>
                {copy.write.feedback}
              </Link>
              <Link className={styles.footerWriteLink} href={copy.write.talkHref}>
                {copy.write.talk}
              </Link>
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
          <p className={styles.copy}>{copy.footer.copyright}</p>
        </div>
      </footer>
    </>
  )
}
