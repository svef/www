import { Logo } from '@/components/Logo/Logo'
import { BlockMotif } from '@/components/BlockMotif/BlockMotif'
import styles from './Footer.module.scss'

export interface FooterSocial {
  label: string
  href: string
}

export function Footer({
  blurb,
  email,
  socials,
  year,
}: {
  blurb: string
  email: string
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
          <ul className={styles.socials}>
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} className={styles.social} aria-label={s.label}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className={styles.copy}>© SVEF {year}</p>
        </div>
      </div>
    </footer>
  )
}
