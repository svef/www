import Link from 'next/link'
import { SocialIcon } from '@/components/SocialIcon/SocialIcon'
import type { SocialLink } from '@/lib/content/site-settings'
import styles from './Footer.module.scss'

export type FooterSocial = SocialLink

export function Footer({
  blurb,
  blurbLang,
  email,
  contactHref,
  contactLabel,
  write,
  socials,
  year,
}: {
  blurb: string
  /**
   * Set only when `blurb` is not in the page's language — an English page
   * whose blurb has not been translated yet. Marking it is the same rule the
   * content pages follow: fallback copy is announced as what it is rather than
   * read out in the wrong voice.
   */
  blurbLang?: string
  email: string
  /**
   * The contact page. It is linked from here and nowhere else — the header row
   * has no room for it — so losing this link strands the page (svef/www#107).
   *
   * Omitted while the rest of the site is hidden: the contact page is not one of
   * the pages reachable then, so the link would bounce the reader to the landing.
   */
  contactHref?: string
  contactLabel?: string
  /** The two things a reader can send us. Rendered above the address. */
  write?: { heading: string; links: { href: string; label: string }[] }
  /**
   * Only the networks the association actually has a URL for. An empty list is
   * the normal state today and drops the row entirely — a row of links that go
   * nowhere is worse than no row.
   */
  socials: FooterSocial[]
  year: number
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.blurb} lang={blurbLang}>
            {blurb}
          </p>
        </div>
        {write && write.links.length > 0 && (
          <div className={styles.write}>
            <h2 className={styles.writeHeading}>{write.heading}</h2>
            {write.links.map((link) => (
              <Link key={link.href} href={link.href} className={styles.writeLink}>
                {link.label}
              </Link>
            ))}
          </div>
        )}
        <div className={styles.contact}>
          {contactHref && contactLabel ? (
            <Link href={contactHref} className={styles.contactLink}>
              {contactLabel}
            </Link>
          ) : null}
          <a href={`mailto:${email}`} className={styles.email}>
            {email}
          </a>
          {socials.length > 0 && (
            <ul className={styles.socials}>
              {socials.map((s) => (
                <li key={s.name}>
                  {/*
                    The icon carries no text, so the link needs its accessible
                    name from `aria-label`. That is safe here precisely because
                    there is no visible label for it to contradict — WCAG 2.5.3
                    only bites when visible text and accessible name disagree.
                  */}
                  <a href={s.href} className={styles.social} aria-label={s.name}>
                    <SocialIcon name={s.icon} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.copy}>© SVEF {year}</p>
        </div>
      </div>
    </footer>
  )
}
