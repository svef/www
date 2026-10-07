import { Logo } from '@/components/Logo/Logo'
import { SocialIcon } from '@/components/SocialIcon/SocialIcon'
import { BlockMotif } from '@/components/BlockMotif/BlockMotif'
import type { SocialLink } from '@/lib/content/site-settings'
import styles from './Footer.module.scss'

export type FooterSocial = SocialLink

export function Footer({
  blurb,
  blurbLang,
  email,
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
   * Only the networks the association actually has a URL for. An empty list is
   * the normal state today and drops the row entirely — a row of links that go
   * nowhere is worse than no row.
   */
  socials: FooterSocial[]
  year: number
}) {
  return (
    <footer className={styles.footer}>
      <BlockMotif className={styles.motif} />
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo tone="inverse" size="88px" />
          <p className={styles.blurb} lang={blurbLang}>
            {blurb}
          </p>
        </div>
        <div className={styles.contact}>
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
