import { VisuallyHidden } from '@mantine/core'
import { Logo } from '@/components/Logo/Logo'
import { BlockMotif } from '@/components/BlockMotif/BlockMotif'
import type { SocialLink } from '@/lib/content/site-settings'
import styles from './Footer.module.scss'

export type FooterSocial = SocialLink

export function Footer({
  blurb,
  email,
  socials,
  year,
}: {
  blurb: string
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
          <Logo />
          <p className={styles.blurb}>{blurb}</p>
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
                    The design draws a two-letter mark, which is a thin thing to
                    hear read out. The network's name is appended out of sight
                    rather than replacing the mark with `aria-label`: the
                    accessible name has to contain the visible text (WCAG 2.5.3
                    Label in Name), and this is the same construction the
                    language toggle already uses. X is its own mark, so it gets
                    nothing appended — "X X" helps nobody.
                  */}
                  <a href={s.href} className={styles.social}>
                    {s.short}
                    {s.name !== s.short && <VisuallyHidden> {s.name}</VisuallyHidden>}
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
