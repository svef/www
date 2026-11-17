import Link from 'next/link'
import { GrowText } from '@/components/GrowText/GrowText'
import { Notch } from '@/components/Shape/Notch'
import { Shape } from '@/components/Shape/Shape'
import { PageStickers } from '@/components/Sticker/PageStickers'
import type { Locale } from '@/lib/i18n'
import { SocialIcon } from '@/components/SocialIcon/SocialIcon'
import { withoutHiddenLinks } from '@/lib/i18n'
import type { SocialLink } from '@/lib/content/site-settings'
import styles from './Footer.module.scss'

export type FooterSocial = SocialLink

export interface FooterColumn {
  heading: string
  links: { href: string; label: string }[]
}

/**
 * The site footer: one violet shape band holding the about blurb, the address, the
 * page columns and the socials (the export's `.site-foot`).
 *
 * Not ported: the export's `Lagalegt` column (the privacy and cookie pages are
 * skipped, #121) and the 3D trophy in the bottom-right corner, which belongs to the
 * on-hold Web Awards work. That corner is a decorative notch instead.
 */
export function Footer({
  blurb,
  blurbLang,
  email,
  contactHeading,
  columns,
  columnsLabel,
  socials,
  locale,
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
  /** The small label above the address. */
  contactHeading: string
  /**
   * The link columns, in the export's order. Links to hidden pages are dropped
   * here whatever the caller passed (see `HIDDEN_PAGES`), and so is a column left
   * with nothing in it.
   */
  columns: FooterColumn[]
  /** Accessible name of the `<nav>` the columns form. */
  columnsLabel: string
  /**
   * Only the networks the association actually has a URL for. An empty list is
   * the normal state today and drops the row entirely — a row of links that go
   * nowhere is worse than no row.
   */
  socials: FooterSocial[]
  /**
   * The page's locale. When given, the footer carries its sticker, as the export
   * does: the "not accessible" sticker sits in the top-left notch and the blurb
   * stays behind it only as an invisible, `aria-hidden` sizer for that notch
   * (#121). Without it, as on the landing page, the blurb is shown as text.
   */
  locale?: Locale
}) {
  const withSticker = locale !== undefined

  const visible = columns
    .map((column) => ({ ...column, links: withoutHiddenLinks(column.links) }))
    .filter((column) => column.links.length > 0)

  return (
    <footer className={styles.siteFoot}>
      <Shape
        color="violet"
        band
        auto="tr,bl,br"
        autoMobile="tr"
        ambient="lively"
        inset
        className={styles.band}
      >
        {withSticker && <PageStickers page="footer" band="footer" locale={locale} />}
        <div className={styles.wrap}>
          {withSticker ? (
            <Notch
              corner="tl"
              as="p"
              className={`${styles.about} ${styles.aboutGhost}`}
              aria-hidden="true"
            >
              {blurb}
            </Notch>
          ) : (
            <Notch corner="tl" as="p" className={styles.about} lang={blurbLang}>
              {blurb}
            </Notch>
          )}

          <div className={styles.contact}>
            <p className={styles.chip}>{contactHeading}</p>
            <a href={`mailto:${email}`} className={styles.mail}>
              <GrowText className={styles.mailText}>{email}</GrowText>
            </a>
          </div>

          <div className={styles.right}>
            {visible.length > 0 && (
              <nav className={styles.cols} aria-label={columnsLabel}>
                {visible.map((column) => (
                  <div key={column.heading} className={styles.col}>
                    <h2 className={styles.chip}>{column.heading}</h2>
                    <ul>
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            )}
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
                    <a href={s.href} aria-label={s.name}>
                      <SocialIcon name={s.icon} size={20} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Shape>
    </footer>
  )
}
